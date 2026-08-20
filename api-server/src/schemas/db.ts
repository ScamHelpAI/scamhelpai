import { z } from "zod";
import { assetSchema } from "./asset.js";
import { analysisInputSchema } from "./analysis-input.js";
import { analysisStatusSchema, riskLevelSchema } from "./analysis-result.js";
import { evidenceSchema } from "./evidence.js";
import { analystAssessmentSchema } from "./analyst.js";
import { reviewerAssessmentSchema } from "./reviewer.js";
import { scamTypeSchema } from "./analyst.js";
import { confidenceSchema, idSchema, timestampSchema } from "./shared.js";

/**
 * Persistence-layer records. These mirror the initial database tables and
 * keep process data separate from the public AnalysisResult shape.
 */

export const analysisRecordSchema = z.object({
  id: idSchema,
  status: analysisStatusSchema,
  riskScore: confidenceSchema,
  riskLevel: riskLevelSchema,
  confidence: confidenceSchema,
  scamType: scamTypeSchema,
  claimedIdentity: z.string().nullable().optional(),
  summary: z.string(),
  createdAt: timestampSchema,
  completedAt: timestampSchema.nullable().optional(),
});

export type AnalysisRecord = z.infer<typeof analysisRecordSchema>;

export const analysisInputRecordSchema = z.object({
  id: idSchema,
  analysisId: idSchema,
  position: z.number().int().nonnegative(),
  input: analysisInputSchema,
  createdAt: timestampSchema,
});

export type AnalysisInputRecord = z.infer<typeof analysisInputRecordSchema>;

export const assetRecordSchema = assetSchema;

export type AssetRecord = z.infer<typeof assetRecordSchema>;

export const evidenceRecordSchema = evidenceSchema.extend({
  analysisId: idSchema,
});

export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export const agentRoleSchema = z.enum(["analyst", "reviewer"]);

export type AgentRole = z.infer<typeof agentRoleSchema>;

export const agentRunRecordSchema = z.object({
  id: idSchema,
  analysisId: idSchema,
  role: agentRoleSchema,
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  resultJson: z.union([analystAssessmentSchema, reviewerAssessmentSchema]),
  createdAt: timestampSchema,
});

export type AgentRunRecord = z.infer<typeof agentRunRecordSchema>;

export const toolCallRecordSchema = z.object({
  id: idSchema,
  analysisId: idSchema,
  agentRunId: idSchema,
  tool: z.string().min(1),
  argumentsJson: z.record(z.string(), z.unknown()),
  resultJson: z.unknown(),
  success: z.boolean(),
  durationMs: z.number().int().nonnegative().optional(),
  createdAt: timestampSchema,
});

export type ToolCallRecord = z.infer<typeof toolCallRecordSchema>;

export const feedbackVerdictSchema = z.enum([
  "correct",
  "incorrect",
  "partially_correct",
]);

export type FeedbackVerdict = z.infer<typeof feedbackVerdictSchema>;

export const feedbackRecordSchema = z.object({
  id: idSchema,
  analysisId: idSchema,
  verdict: feedbackVerdictSchema,
  comment: z.string().optional(),
  createdAt: timestampSchema,
});

export type FeedbackRecord = z.infer<typeof feedbackRecordSchema>;

/** Join table linking analyses to uploaded assets. */
export const analysisAssetRecordSchema = z.object({
  analysisId: idSchema,
  assetId: idSchema,
  createdAt: timestampSchema,
});

export type AnalysisAssetRecord = z.infer<typeof analysisAssetRecordSchema>;
