import { z } from "zod";
import { confidenceSchema, idSchema, timestampSchema } from "./shared.js";
import { scamTypeSchema } from "./analyst.js";
import { publicEvidenceSchema } from "./evidence.js";

export const analysisStatusSchema = z.enum([
  "queued",
  "analyzing",
  "reviewing",
  "completed",
  "failed",
]);

export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const riskSummarySchema = z.object({
  score: confidenceSchema,
  level: riskLevelSchema,
  confidence: confidenceSchema,
});

export type RiskSummary = z.infer<typeof riskSummarySchema>;

export const classificationSchema = z.object({
  primary: scamTypeSchema,
  secondary: z.array(scamTypeSchema).optional(),
});

export type Classification = z.infer<typeof classificationSchema>;

export const analysisResultSchema = z.object({
  id: idSchema,
  status: analysisStatusSchema,
  risk: riskSummarySchema,
  classification: classificationSchema,
  claimedIdentity: z.string().optional(),
  summary: z.string().min(1),
  evidence: z.array(publicEvidenceSchema),
  recommendedActions: z.array(z.string()),
  createdAt: timestampSchema,
  completedAt: timestampSchema.optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
