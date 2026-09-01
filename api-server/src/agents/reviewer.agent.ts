import { Output, ToolLoopAgent, gateway, type GatewayModelId } from "ai";
import {
  reviewerAssessmentSchema,
  type ReviewerAssessment,
} from "../schemas/reviewer.js";
import { createReviewerTools } from "../tools/index.js";

const REVIEWER_INSTRUCTIONS = `You review scanner findings and produce a final structured assessment.

Use tools to verify or challenge specific evidence when needed before returning your output.

Return a structured assessment with:
- verdict: agree | agree_with_adjustments | disagree | insufficient_evidence
- finalScamProbability: number from 0 to 1
- finalScamType: the best-fit scam classification
- supportedClaims: claims backed by evidence, each with evidenceIds
- unsupportedClaims: claims that lack adequate evidence
- contradictions: conflicting observations found during review
- confidenceAdjustment: how much you changed confidence from the initial assessment (negative lowers, positive raises)
- additionalEvidenceIds: any new evidence ids surfaced during review
- reasoningSummary: concise explanation of your final judgment

Ground every claim in evidence ids from the scanner. Be conservative when evidence is weak.`;

export function createReviewerAgent(model: GatewayModelId) {
  return new ToolLoopAgent({
    id: "reviewer",
    model: gateway(model),
    instructions: REVIEWER_INSTRUCTIONS,
    tools: createReviewerTools(),
    output: Output.object({
      schema: reviewerAssessmentSchema,
      description:
        "Final reviewed assessment of scam risk after verifying scanner evidence.",
    }),
  });
}

export type ReviewerAgent = ReturnType<typeof createReviewerAgent>;

export type ReviewerOutput = ReviewerAssessment;
