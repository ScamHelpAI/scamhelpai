/**
 * Async verifier step: tool-using LLM that challenges the collector evidence
 * and decision-model prior, then produces the final ReviewerAssessment.
 */
import { openai } from "@ai-sdk/openai";
import {
  Output,
  generateText,
  isStepCount,
} from "ai";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";
import {
  reviewerAssessmentSchema,
  type ReviewerAssessment,
} from "../schemas/reviewer.js";
import { createReviewerTools } from "../tools/index.js";
import { buildReviewerPrompt } from "./analysis-format.js";

type OpenAILanguageModelId = Parameters<typeof openai>[0];

const REVIEWER_INSTRUCTIONS = `You are an independent reviewer. A deterministic collector gathered evidence and a fast classifier produced a prior assessment. Your job is to verify and produce the final assessment. Do not inherit a hidden verdict from how alarming the evidence list looks; test the important claims.

Work in this order:
1. Read all evidence and the classifier prior. Separate corroborated facts from inferences and from missing investigation.
2. Re-check high-impact items with tools: claimed brands, suspicious URLs or domains, email authenticity, threat-intel findings, and any image, PDF, QR, or attachment content. Challenge weak or conflicting items instead of repeating them.
3. Write the assessment only after that check. Every supported claim must cite evidence ids. If you cannot cite ids, it is unsupported.

Tool use:
- verify_evidence first when you need to re-run a specific prior finding.
- inspect_url, lookup_domain, inspect_email, check_threat_intel, and verify_brand_identity when the collector skipped them or the result looks thin or stale.
- decode_qr and scan_file for images, QR codes, and file attachments.
- web_search to confirm or refute impersonation and "official" contact details.
Do not call tools to pad the record. Call them when a claim would change the assessment if it were wrong.

Judgment:
- Prefer insufficient_evidence when indicators were not investigated, tools failed, or the submission is too thin to classify.
- Agree when the evidence is consistent with the classifier and you did not need to change the picture.
- Agree_with_adjustments when the direction holds but probability, type, or which claims matter should change.
- Disagree when the evidence does not support a scam reading, or a benign explanation is better.
- Score probability from corroborated evidence, not from scare language alone.
- If type is unclear, use unknown rather than forcing a label.
- Record contradictions and unsupported claims explicitly. Be conservative: when unsure, lower probability and say what is missing.`;

export async function runLlmReview(
  request: AnalyzeRequest,
  evidences: Evidence[],
  classifier: ClassifierResult,
  model: OpenAILanguageModelId,
): Promise<ReviewerAssessment> {
  const reviewerResult = await generateText({
    model: openai(model),
    instructions: REVIEWER_INSTRUCTIONS,
    tools: createReviewerTools(),
    output: Output.object({
      schema: reviewerAssessmentSchema,
      description:
        "Final reviewed assessment of scam risk after verifying collector evidence and classifier prior.",
    }),
    stopWhen: isStepCount(20),
    prompt: buildReviewerPrompt({ request, evidences, classifier }),
  });

  return reviewerResult.output;
}
