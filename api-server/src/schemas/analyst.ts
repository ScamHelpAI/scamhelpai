import { z } from "zod";
import { confidenceSchema, idSchema } from "./shared.js";

export const scamTypeSchema = z.enum([
  "credential_phishing",
  "impersonation",
  "tech_support",
  "investment",
  "romance",
  "job",
  "invoice",
  "payment",
  "crypto",
  "account_takeover",
  "malware",
  "other",
  "unknown",
]);

export type ScamType = z.infer<typeof scamTypeSchema>;

export const analystContradictionSchema = z.object({
  description: z.string().min(1),
  evidenceIds: z.array(idSchema),
});

export const analystAssessmentSchema = z.object({
  scamProbability: confidenceSchema,
  scamType: scamTypeSchema,
  claimedIdentity: z.string().optional(),
  attackerGoal: z.string().optional(),
  requestedActions: z.array(z.string()),
  manipulationTechniques: z.array(z.string()),
  suspiciousSignals: z.array(z.string()),
  contradictions: z.array(analystContradictionSchema),
  supportingEvidenceIds: z.array(idSchema),
  uncertainty: z.array(z.string()),
  needsMoreInvestigation: z.boolean(),
});

export type AnalystAssessment = z.infer<typeof analystAssessmentSchema>;
