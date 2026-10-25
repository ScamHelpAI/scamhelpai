/**
 * Extracts text and deterministic tool evidence from uploaded image, PDF, and
 * audio analysis inputs.
 */
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../../schemas/analysis-input.js";
import type { Evidence, EvidenceType } from "../../schemas/evidence.js";
import { logModelCost } from "../cost-log.js";
import { decodeQr } from "../../tools/decode-qr.js";
import { scanFile } from "../../tools/scan-file.js";
import { getReadyAssetBytes } from "./asset-load.js";

const OCR_MODEL = "gpt-6-luna" as const;
const PDF_MIN_TEXT_CHARS = 80;
const EXCERPT_MAX = 500;

export type AssetIngestResult = {
  extractedTextByInputIndex: Map<number, string>;
  evidences: Evidence[];
};

function excerpt(text: string, max = EXCERPT_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function createIngestEvidence(params: {
  id: string;
  type: EvidenceType;
  summary: string;
  confidence: number;
  toolName: string;
  sourceInputId: string;
  data?: Record<string, unknown>;
  createdAt: string;
}): Evidence {
  return {
    id: params.id,
    type: params.type,
    source: "tool",
    summary: params.summary,
    confidence: params.confidence,
    toolName: params.toolName,
    sourceInputId: params.sourceInputId,
    data: params.data,
    createdAt: params.createdAt,
  };
}

function summarizeScanResult(
  result: Awaited<ReturnType<typeof scanFile>>,
): string {
  const vt = result.malwareScan;
  const vtText =
    vt && vt.malicious
      ? `malware scan: ${vt.maliciousCount} malicious hits`
      : vt
        ? "malware scan: no malicious hits"
        : "malware scan: unavailable";
  const urlText =
    result.embeddedUrls.length > 0
      ? `${result.embeddedUrls.length} embedded URL(s)`
      : "no embedded URLs";
  return `File ${result.filename ?? "upload"} (${result.mimeType}, ${result.size} bytes); ${vtText}; ${urlText}`;
}

async function extractTextFromImageBytes(
  bytes: Uint8Array,
  mediaType: string,
): Promise<string> {
  const result = await generateText({
    model: openai(OCR_MODEL),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract all readable text from this screenshot or document image. Return plain text only, preserving line breaks where helpful. If there is no readable text, return nothing.",
          },
          {
            type: "file",
            data: bytes,
            mediaType: mediaType.startsWith("image/") ? mediaType : "image/png",
          },
        ],
      },
    ],
  });

  logModelCost("ingest_ocr", OCR_MODEL, result.usage, { result });
  return result.text.trim();
}

async function transcribeAudioBytes(
  bytes: Uint8Array,
  contentType: string,
  filename?: string,
): Promise<string> {
  const { env } = await import("../../config/env.js");
  const blob = new Blob([Buffer.from(bytes)], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, filename ?? "audio.bin");
  formData.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Audio transcription failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as { text?: string };
  return json.text?.trim() ?? "";
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

async function ocrPdfFirstPage(bytes: Uint8Array): Promise<string> {
  const pageImage = await renderPageAsImage(bytes, 1, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: 2,
  });
  const pageBytes = new Uint8Array(pageImage as ArrayBuffer);
  return extractTextFromImageBytes(pageBytes, "image/png");
}

async function ingestBinaryInput(params: {
  input: AnalysisInput;
  inputIndex: number;
  sourceInputId: string;
  createdAt: string;
  nextId: () => string;
}): Promise<{ text: string; evidences: Evidence[] }> {
  if (
    params.input.type !== "image" &&
    params.input.type !== "pdf" &&
    params.input.type !== "audio"
  ) {
    return { text: "", evidences: [] };
  }

  const { asset, bytes } = await getReadyAssetBytes(params.input.assetId);
  const filename = asset.metadata?.filename;
  const base64 = Buffer.from(bytes).toString("base64");
  const evidences: Evidence[] = [];

  const scan = await scanFile(base64, filename);
  evidences.push(
    createIngestEvidence({
      id: params.nextId(),
      type: "file",
      summary: summarizeScanResult(scan),
      confidence: scan.malwareScan?.malicious ? 0.9 : 0.8,
      toolName: "scan_file",
      sourceInputId: params.sourceInputId,
      data: {
        assetId: params.input.assetId,
        sha256: scan.hashes.sha256,
      },
      createdAt: params.createdAt,
    }),
  );

  let text = "";

  if (params.input.type === "image") {
    const qr = await decodeQr(base64);
    if (qr.decoded && qr.payloads.length > 0) {
      evidences.push(
        createIngestEvidence({
          id: params.nextId(),
          type: qr.destinations.length > 0 ? "url" : "visual",
          summary:
            qr.destinations.length > 0
              ? `QR code points to ${qr.destinations.join(", ")}`
              : `QR code decoded: ${excerpt(qr.payloads[0] ?? "")}`,
          confidence: 0.85,
          toolName: "decode_qr",
          sourceInputId: params.sourceInputId,
          data: { payloads: qr.payloads, destinations: qr.destinations },
          createdAt: params.createdAt,
        }),
      );
    }

    text = await extractTextFromImageBytes(bytes, asset.contentType);
  } else if (params.input.type === "pdf") {
    text = await extractPdfText(bytes);
    if (text.length < PDF_MIN_TEXT_CHARS) {
      const ocrText = await ocrPdfFirstPage(bytes);
      if (ocrText.length > text.length) {
        text = ocrText;
      }
    }
  } else {
    text = await transcribeAudioBytes(bytes, asset.contentType, filename);
  }

  if (text.length > 0) {
    const toolName =
      params.input.type === "image"
        ? "ingest_image"
        : params.input.type === "pdf"
          ? "ingest_pdf"
          : "ingest_audio";
    evidences.push(
      createIngestEvidence({
        id: params.nextId(),
        type: "text",
        summary: `Extracted text from ${params.input.type} (${text.length} characters): ${excerpt(text)}`,
        confidence: 0.75,
        toolName,
        sourceInputId: params.sourceInputId,
        data: { assetId: params.input.assetId, length: text.length },
        createdAt: params.createdAt,
      }),
    );
  }

  return { text, evidences };
}

export async function ingestAssetInputs(
  request: AnalyzeRequest,
  nextId: () => string,
  createdAt: string,
): Promise<AssetIngestResult> {
  const extractedTextByInputIndex = new Map<number, string>();
  const evidences: Evidence[] = [];

  for (let index = 0; index < request.inputs.length; index += 1) {
    const input = request.inputs[index];
    if (
      input.type !== "image" &&
      input.type !== "pdf" &&
      input.type !== "audio"
    ) {
      continue;
    }

    const sourceInputId = `input-${index + 1}`;
    const result = await ingestBinaryInput({
      input,
      inputIndex: index,
      sourceInputId,
      createdAt,
      nextId,
    });
    if (result.text) {
      extractedTextByInputIndex.set(index, result.text);
    }
    evidences.push(...result.evidences);
  }

  return { extractedTextByInputIndex, evidences };
}

export function getExtractedTextForInput(
  inputIndex: number,
  extractedTextByInputIndex: Map<number, string>,
): string {
  return extractedTextByInputIndex.get(inputIndex) ?? "";
}
