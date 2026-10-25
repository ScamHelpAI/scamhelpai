import type {
  AnalysisResult,
  AnalyzeRequest,
  PresignAssetResponse,
} from "@/lib/analysis-types";
import { analyzerErrorMessage } from "@/lib/scamhelp-api-base";

const EXTENSION_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".txt": "text/plain",
  ".eml": "message/rfc822",
};

export function sniffFileContentType(file: File): string {
  const normalized = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }

  const lowerName = file.name.toLowerCase();
  const dot = lowerName.lastIndexOf(".");
  if (dot === -1) {
    return normalized || "application/octet-stream";
  }

  const ext = lowerName.slice(dot);
  return EXTENSION_MIME[ext] ?? (normalized || "application/octet-stream");
}

async function readError(res: Response): Promise<string> {
  const bodyText = await res.text().catch(() => "");
  return analyzerErrorMessage(res.status, bodyText);
}

export async function createAnalysis(
  request: AnalyzeRequest,
): Promise<AnalysisResult> {
  const res = await fetch("/api/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return res.json() as Promise<AnalysisResult>;
}

export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const res = await fetch(`/api/analyses/${encodeURIComponent(id)}`);

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return res.json() as Promise<AnalysisResult>;
}

export async function presignAsset(payload: {
  contentType: string;
  filename?: string;
  sizeBytes?: number;
}): Promise<PresignAssetResponse> {
  const res = await fetch("/api/assets/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return res.json() as Promise<PresignAssetResponse>;
}

export async function completeAsset(assetId: string): Promise<void> {
  const res = await fetch(
    `/api/assets/${encodeURIComponent(assetId)}/complete`,
    { method: "POST" },
  );

  if (!res.ok) {
    throw new Error(await readError(res));
  }
}

export async function uploadFileForAnalysis(
  file: File,
): Promise<Extract<AnalyzeRequest["inputs"][number], { assetId: string }>> {
  const contentType = sniffFileContentType(file);

  const presign = await presignAsset({
    contentType,
    filename: file.name,
    sizeBytes: file.size,
  });

  const uploadHeaders = new Headers(presign.requiredHeaders ?? {});
  if (!uploadHeaders.has("Content-Type")) {
    uploadHeaders.set("Content-Type", contentType);
  }

  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: uploadHeaders,
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload failed. Try a smaller file or paste the text instead.");
  }

  await completeAsset(presign.assetId);

  const inputType = assetInputType(file, contentType);
  return { type: inputType, assetId: presign.assetId };
}

function assetInputType(
  file: File,
  contentType: string,
): "image" | "pdf" | "audio" {
  const type = contentType || sniffFileContentType(file);
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("audio/")) return "audio";
  throw new Error(
    "Unsupported file type. Use an image, PDF, audio file, or paste plain text.",
  );
}

export function isTextFile(file: File): boolean {
  return (
    file.type === "text/plain" ||
    file.name.toLowerCase().endsWith(".txt") ||
    file.name.toLowerCase().endsWith(".eml")
  );
}
