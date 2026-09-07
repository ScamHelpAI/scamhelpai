import {
  Output,
  gateway,
  generateText,
  isStepCount,
  type GatewayModelId,
} from "ai";
import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../schemas/analysis-input.js";
import type { Evidence } from "../schemas/evidence.js";
import {
  reviewerAssessmentSchema,
  type ReviewerAssessment,
} from "../schemas/reviewer.js";
import {
  normalizeScannerOutput,
  scannerOutputSchema,
} from "../schemas/scanner.js";
import { createReviewerTools, createScannerTools } from "../tools/index.js";

const SCANNER_INSTRUCTIONS = `You are a forensic collector. Your job is to extract and investigate indicators from the submission, then return factual evidence. A separate reviewer will judge scam risk. Do not output a verdict, probability, scam type, or recommended actions.

Work in this order:
1. Read every input and any context. Extract concrete indicators: URLs, domains, emails, phone numbers, crypto addresses, brand or official-looking names, QR codes, attachments, payment asks, login or credential prompts, and urgency or secrecy language.
2. Investigate each distinct indicator with tools before treating it as confirmed. Prefer a tool result over an untested guess.
3. Return every distinct observation you can support. One fact per evidence item. Do not merge unrelated findings.

Tool use:
- inspect_url and lookup_domain for links and hostnames; trace_redirects when a URL may hop through shorteners or intermediates; inspect_page when you need on-page content or forms.
- inspect_email for raw messages or headers.
- check_threat_intel for domains, URLs, and other observables that may already be known.
- verify_brand_identity when the content claims to be a company, bank, government, or well-known product.
- lookup_phone and lookup_crypto_address when those identifiers appear.
- decode_qr and scan_file for images, QR codes, and files.
- parallel_search to check public facts, brand claims, and whether a domain or contact matches a real organization.
Do not skip a relevant tool because the content already "looks" like a scam or already "looks" legitimate. Absence of a hit is still useful; record it as evidence.

Evidence quality:
- Summaries must be observable facts ("domain registered 2 days ago", "page asks for a password on a non-HTTPS form"), not conclusions ("this is phishing").
- Set confidence from how directly the observation is supported. Tool-backed facts are higher; inferences from wording alone are lower and should use source analyst.
- Use source tool only when the observation comes from a tool result, and name that tool. Use source user_input for facts taken from the submission itself. Never use source reviewer.
- Tie items to a sourceInputId when they come from a specific input.
- Deduplicate: do not repeat the same fact from the same source. If a tool confirms a user_input observation, keep both only when they add new information.`;

const REVIEWER_INSTRUCTIONS = `You are an independent reviewer. The scanner collected evidence and did not judge. You produce the final assessment. Do not inherit a hidden verdict from how alarming the evidence list looks; test the important claims.

Work in this order:
1. Read all evidence. Separate corroborated facts from inferences and from missing investigation.
2. Re-check high-impact items with tools: claimed brands, suspicious URLs or domains, email authenticity, and threat-intel findings. Challenge weak or conflicting items instead of repeating them.
3. Write the assessment only after that check. Every supported claim must cite evidence ids. If you cannot cite ids, it is unsupported.

Tool use:
- verify_evidence first when you need to re-run a specific prior finding.
- inspect_url, lookup_domain, inspect_email, check_threat_intel, and verify_brand_identity when the scanner skipped them or the result looks thin or stale.
- parallel_search to confirm or refute impersonation and "official" contact details.
Do not call tools to pad the record. Call them when a claim would change the assessment if it were wrong.

Judgment:
- Prefer insufficient_evidence when indicators were not investigated, tools failed, or the submission is too thin to classify.
- Agree when the evidence is consistent and you did not need to change the picture.
- Agree_with_adjustments when the direction holds but probability, type, or which claims matter should change.
- Disagree when the evidence does not support a scam reading, or a benign explanation is better (known brand domain, expected transactional mail, user-initiated contact).
- Score probability from corroborated evidence, not from scare language alone. Urgency, fear, and authority pressure are signals; they are not proof. High scores need independent support such as lookalike domains, credential capture, malware, payment redirection, or impersonation that fails brand checks.
- If type is unclear, use unknown rather than forcing a label.
- Record contradictions and unsupported claims explicitly. Be conservative: when unsure, lower probability and say what is missing.`;

export type RunAnalysisResult = {
  evidences: Evidence[];
  assessment: ReviewerAssessment;
};

function formatInput(input: AnalysisInput, index: number): string {
  const label = `Input ${index + 1} (${input.type})`;

  switch (input.type) {
    case "text":
      return `${label}:\n${input.content}`;
    case "url":
      return `${label}:\n${input.url}`;
    case "image":
      return `${label}:\nassetId: ${input.assetId}`;
    case "audio":
      return `${label}:\nassetId: ${input.assetId}`;
    case "pdf":
      return `${label}:\nassetId: ${input.assetId}`;
    case "email": {
      const parts = [label];
      if (input.raw) parts.push(`raw:\n${input.raw}`);
      if (input.headers) {
        parts.push(`headers:\n${JSON.stringify(input.headers, null, 2)}`);
      }
      if (input.body) parts.push(`body:\n${input.body}`);
      if (input.assetIds?.length) {
        parts.push(`assetIds: ${input.assetIds.join(", ")}`);
      }
      return parts.join("\n");
    }
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

function buildScannerPrompt(request: AnalyzeRequest): string {
  const inputBlocks = request.inputs.map(formatInput).join("\n\n");
  const contextBlock = request.context
    ? `\n\nContext:\n${JSON.stringify(request.context, null, 2)}`
    : "";

  return `Investigate the following submission.\n\n${inputBlocks}${contextBlock}`;
}

function buildReviewerPrompt(evidences: Evidence[]): string {
  return `Review this scanner evidence.\n\nEvidence:\n${JSON.stringify(evidences, null, 2)}`;
}

export async function runAnalysis(
  request: AnalyzeRequest,
  model: GatewayModelId,
): Promise<RunAnalysisResult> {
  const scannerResult = await generateText({
    model: gateway(model),
    instructions: SCANNER_INSTRUCTIONS,
    tools: createScannerTools(),
    output: Output.object({
      schema: scannerOutputSchema,
      description:
        "All factual evidence gathered from user inputs and tool results.",
    }),
    stopWhen: isStepCount(20),
    prompt: buildScannerPrompt(request),
  });

  const evidences = normalizeScannerOutput(scannerResult.output).evidences;

  const reviewerResult = await generateText({
    model: gateway(model),
    instructions: REVIEWER_INSTRUCTIONS,
    tools: createReviewerTools(),
    output: Output.object({
      schema: reviewerAssessmentSchema,
      description:
        "Final reviewed assessment of scam risk after verifying scanner evidence.",
    }),
    stopWhen: isStepCount(20),
    prompt: buildReviewerPrompt(evidences),
  });

  return {
    evidences,
    assessment: reviewerResult.output,
  };
}
