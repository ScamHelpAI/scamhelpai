/**
 * Async verifier step: tool-using LLM that challenges the collector evidence
 * and decision-model prior, then produces the final ReviewerAssessment.
 */
import { openai } from "@ai-sdk/openai";
import { Output, generateText, isStepCount } from "ai";
import type { AnalyzeRequest } from "../../schemas/analysis-input.js";
import type { ClassifierResult } from "../../schemas/classifier.js";
import type { Evidence } from "../../schemas/evidence.js";
import {
  reviewerAssessmentSchema,
  type ReviewerAssessment,
} from "../../schemas/reviewer.js";
import { createReviewerTools } from "../../tools/index.js";
import { buildReviewerPrompt } from "./analysis-format.js";
import { logModelCost } from "../cost-log.js";

type OpenAILanguageModelId = Parameters<typeof openai>[0];

const REVIEWER_INSTRUCTIONS = `You are an independent reviewer. A deterministic collector gathered evidence and a fast classifier produced a prior assessment. Your job is to verify and produce the final assessment. Do not inherit a hidden verdict from how alarming the evidence list looks; test the important claims.

Work in this order:
1. Read all evidence and the classifier prior. Separate corroborated facts from inferences and from missing investigation.
2. Re-check high-impact items with tools: claimed brands, suspicious URLs or domains, email authenticity, threat-intel findings, and any image, PDF, QR, or attachment content. Challenge weak or conflicting items instead of repeating them.
3. Write the assessment only after that check. Every supported claim must cite evidence ids. If you cannot cite ids, it is unsupported.

Tool use:
- verify_evidence first when you need to re-run a specific prior finding.
- inspect_url, lookup_domain, inspect_email, check_threat_intel, and verify_brand_identity when the collector skipped them or the result looks thin or stale.
- Prefer ingest evidence (ingest_image, ingest_pdf, ingest_audio, scan_file, decode_qr) before re-fetching files.
- load_submission_asset then decode_qr or scan_file when you need to re-check binary content.
- web_search to confirm or refute impersonation and "official" contact details.
Do not call tools to pad the record. Call them when a claim would change the assessment if it were wrong.

Judgment:
- Prefer insufficient_evidence when indicators were not investigated, tools failed, or the submission is too thin to classify.
- Agree when the evidence is consistent with the classifier and you did not need to change the picture.
- Agree_with_adjustments when the direction holds but probability, type, or which claims matter should change.
- Disagree when the evidence does not support a scam reading, or a benign explanation is better.
- Score probability from corroborated evidence, not from scare language alone.
- If type is unclear, use unknown rather than forcing a label.
- Record contradictions and unsupported claims explicitly. Be conservative: when unsure, lower probability and say what is missing.

User-facing annotations:
- decision is one plain-language verdict for the whole message (title plus one Don't line and one Do line). Write for a non-expert reader.
- riskyParts lists only phrases that appear verbatim in the submission text and that make the message risky. Prefer exact substrings a reader would see (not HTML tags). Use at most eight entries; one short sentence per message. If nothing in the text is specifically risky, return an empty riskyParts array.`;

export async function runLlmReview(
  request: AnalyzeRequest,
  evidences: Evidence[],
  classifier: ClassifierResult,
  model: OpenAILanguageModelId,
  extractedTextByInputIndex: Map<number, string> = new Map(),
  allowedAssetIds: string[] = [],
): Promise<ReviewerAssessment> {
  const reviewerResult = await generateText({
    model: openai(model),
    instructions: REVIEWER_INSTRUCTIONS,
    tools: createReviewerTools(allowedAssetIds),
    output: Output.object({
      schema: reviewerAssessmentSchema,
      description:
        "Final reviewed assessment of scam risk after verifying collector evidence and classifier prior.",
    }),
    stopWhen: isStepCount(20),
    prompt: buildReviewerPrompt({
      request,
      evidences,
      classifier,
      extractedTextByInputIndex,
    }),
  });

  logModelCost("reviewer", model, reviewerResult.usage, {
    result: reviewerResult,
  });

  return reviewerResult.output;
}
