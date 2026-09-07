import { z } from "zod";
import { confidenceSchema, idSchema, timestampSchema } from "./shared.js";

export const evidenceTypeSchema = z
  .enum([
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
  ])
  .describe(
    "Kind of observation: visual, text, url, domain, email, threat_intel, identity, file, external, or model_inference",
  );

export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const evidenceSourceSchema = z
  .enum(["user_input", "analyst", "tool", "reviewer"])
  .describe(
    "Where the observation came from: user_input (submitted content), tool (tool result), analyst (scanner observation without a tool), or reviewer (found during review)",
  );

export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;

export const evidenceSchema = z.object({
  id: idSchema.describe("Stable identifier such as ev-001"),
  type: evidenceTypeSchema,
  source: evidenceSourceSchema,
  summary: z
    .string()
    .min(1)
    .describe("One factual sentence describing what was observed"),
  confidence: confidenceSchema.describe(
    "Confidence that this observation is accurate, from 0 to 1",
  ),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional structured payload, such as a tool result excerpt"),
  sourceInputId: idSchema
    .optional()
    .describe("Submitted input this observation is tied to, when applicable"),
  toolName: z
    .string()
    .optional()
    .describe(
      "Tool that produced this observation; include when source is tool",
    ),
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
