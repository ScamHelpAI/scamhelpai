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

const REVIEWER_INSTRUCTIONS = `You are a verifier, not a second opinion from scratch. A decision-model classifier already produced the primary assessment (booleans, scam type, and risk). Treat that prior as correct unless your tool checks clearly refute it. Your job is to confirm or lightly adjust it—not to default to "probably fine."

Work in this order:
1. Read the classifier prior first and map it to an expected scam probability band and type. Start from agree unless you find concrete contradictions.
2. Re-check only the claims that would change the assessment if wrong: brands, URLs/domains, email authenticity, threat intel, and any image, PDF, QR, or attachment content.
3. Write the assessment after that check. Every supported claim must cite evidence ids. If you cannot cite ids, it is unsupported.

Tool use:
- verify_evidence first when you need to re-run a specific prior finding.
- inspect_url, lookup_domain, inspect_email, check_threat_intel, and verify_brand_identity when the collector skipped them or the result looks thin or stale.
- Prefer ingest evidence (ingest_image, ingest_pdf, ingest_audio, scan_file, decode_qr) before re-fetching files.
- load_submission_asset then decode_qr or scan_file when you need to re-check binary content.
- web_search to confirm or refute impersonation and "official" contact details.
Do not call tools to pad the record. Call them when a claim would change the assessment if it were wrong.

Judgment:
- Default to agree when tools neither refute nor materially change the classifier picture.
- Use agree_with_adjustments for small changes (probability within the same risk band, minor type tweaks).
- Use insufficient_evidence only when tools failed or the submission is too thin and the classifier itself flagged insufficient_evidence—not as a way to avoid a scary prior.
- Disagree only when tools or submission facts clearly show legitimacy (verified sender/domain, benign official channel, etc.). Theoretical benign explanations are not enough.
- When classifier high-impact booleans are high (roughly ≥0.6), keep finalScamProbability in a matching band (medium/high/critical) unless you have clear refutation. Do not drop to low solely out of caution.
- Derive finalScamProbability from the classifier prior plus corroborating evidence; small downward tweaks are ok, large downgrades require documented contradictions.
- If type is unclear after review, prefer the classifier scam_type when it was confident; otherwise use unknown.
- Record contradictions and unsupported claims explicitly. When unsure after tool checks, stay near the classifier probability and say what is missing.

User-facing annotations:
- decision is one plain-language verdict for the whole message (title plus one Don't line and one Do line). When you agree with the classifier direction, match that severity (do not write a reassuring decision while keeping high scam probability, or the reverse).
- riskyParts lists only phrases that appear verbatim in the submission text and that make the message risky. Prefer exact substrings a reader would see (not HTML tags). Use at most eight entries; one short sentence per message. When the classifier flagged scam signals, include the most relevant quotes; if the final reading is low risk with clear refutation, return an empty riskyParts array.`;

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
