import { z } from "zod";
import { confidenceSchema, idSchema } from "./shared.js";
import { scamTypeSchema } from "./analyst.js";

export const reviewVerdictSchema = z.enum([
  "agree",
  "agree_with_adjustments",
  "disagree",
  "insufficient_evidence",
]);

export type ReviewVerdict = z.infer<typeof reviewVerdictSchema>;

export const supportedClaimSchema = z.object({
  claim: z.string().min(1),
  evidenceIds: z.array(idSchema),
});

export const reviewerAssessmentSchema = z.object({
  verdict: reviewVerdictSchema,
  finalScamProbability: confidenceSchema,
  finalScamType: scamTypeSchema,
  supportedClaims: z.array(supportedClaimSchema),
  unsupportedClaims: z.array(z.string()),
  contradictions: z.array(z.string()),
  confidenceAdjustment: z.number(),
  additionalEvidenceIds: z.array(idSchema),
  reasoningSummary: z.string().min(1),
});

export type ReviewerAssessment = z.infer<typeof reviewerAssessmentSchema>;
