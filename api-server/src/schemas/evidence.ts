import { z } from "zod";
import { confidenceSchema, idSchema, timestampSchema } from "./shared.js";

export const evidenceTypeSchema = z.enum([
  "visual",
  "text",
  "url",
  "domain",
  "email",
  "threat_intel",
  "identity",
  "file",
  "external",
  "model_inference",
]);

export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const evidenceSourceSchema = z.enum([
  "user_input",
  "analyst",
  "tool",
  "reviewer",
]);

export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;

export const evidenceSchema = z.object({
  id: idSchema,
  type: evidenceTypeSchema,
  source: evidenceSourceSchema,
  summary: z.string().min(1),
  confidence: confidenceSchema,
  data: z.record(z.string(), z.unknown()).optional(),
  sourceInputId: idSchema.optional(),
  toolName: z.string().optional(),
  createdAt: timestampSchema,
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const evidenceSeveritySchema = z.enum(["low", "medium", "high"]);

export type EvidenceSeverity = z.infer<typeof evidenceSeveritySchema>;

export const publicEvidenceSchema = z.object({
  id: idSchema,
  summary: z.string().min(1),
  severity: evidenceSeveritySchema,
});

export type PublicEvidence = z.infer<typeof publicEvidenceSchema>;
