import { z } from "zod";
import { confidenceSchema, idSchema } from "./shared.js";
import { scamTypeSchema } from "./analyst.js";

export const reviewVerdictSchema = z
  .enum([
    "agree",
    "agree_with_adjustments",
    "disagree",
    "insufficient_evidence",
  ])
  .describe(
    "How the review relates to the scanner evidence: agree, agree_with_adjustments, disagree, or insufficient_evidence",
  );

export type ReviewVerdict = z.infer<typeof reviewVerdictSchema>;

export const supportedClaimSchema = z.object({
  claim: z.string().min(1).describe("Claim that is backed by evidence"),
  evidenceIds: z
    .array(idSchema)
    .describe("Evidence ids that support this claim"),
});

export const reviewerAssessmentSchema = z.object({
  verdict: reviewVerdictSchema,
  finalScamProbability: confidenceSchema.describe(
    "Final scam probability from 0 to 1",
  ),
  finalScamType: scamTypeSchema,
  supportedClaims: z
    .array(supportedClaimSchema)
    .describe("Claims backed by evidence, each with evidence ids"),
  unsupportedClaims: z
    .array(z.string())
    .describe("Claims that lack adequate evidence"),
  contradictions: z
    .array(z.string())
    .describe("Conflicting observations found during review"),
  confidenceAdjustment: z
    .number()
    .describe(
      "How much confidence changed from the scanner evidence; negative lowers, positive raises",
    ),
  additionalEvidenceIds: z
    .array(idSchema)
    .describe("Evidence ids newly surfaced during review"),
  reasoningSummary: z
    .string()
    .min(1)
    .describe("Concise explanation of the final judgment"),
});

export type ReviewerAssessment = z.infer<typeof reviewerAssessmentSchema>;
