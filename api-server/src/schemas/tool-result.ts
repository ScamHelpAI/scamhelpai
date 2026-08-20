import { z } from "zod";
import { idSchema } from "./shared.js";

export const toolErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

export type ToolError = z.infer<typeof toolErrorSchema>;

export const toolResultSchema = z.object({
  tool: z.string().min(1),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: toolErrorSchema.optional(),
  evidenceIds: z.array(idSchema).optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export type ToolResult<T = unknown> = Omit<
  z.infer<typeof toolResultSchema>,
  "data"
> & {
  data?: T;
};

export const reputationSchema = z.enum([
  "safe",
  "unknown",
  "suspicious",
  "malicious",
]);

export type Reputation = z.infer<typeof reputationSchema>;

export const domainLookupResultSchema = z.object({
  domain: z.string().min(1),
  registeredAt: z.string().optional(),
  ageDays: z.number().int().nonnegative().optional(),
  registrar: z.string().optional(),
  nameservers: z.array(z.string()).optional(),
  ipAddresses: z.array(z.string()).optional(),
  suspicious: z.boolean().optional(),
  reputation: reputationSchema.optional(),
});

export type DomainLookupResult = z.infer<typeof domainLookupResultSchema>;

export const urlInspectionResultSchema = z.object({
  originalUrl: z.string().url(),
  normalizedUrl: z.string().url(),
  finalUrl: z.string().url().optional(),
  redirectChain: z.array(z.string()),
  hostname: z.string().min(1),
  usesHttps: z.boolean(),
  suspiciousFeatures: z.array(z.string()),
  credentialFormDetected: z.boolean().optional(),
});

export type UrlInspectionResult = z.infer<typeof urlInspectionResultSchema>;

export const threatIntelIndicatorTypeSchema = z.enum([
  "url",
  "domain",
  "ip",
  "hash",
]);

export type ThreatIntelIndicatorType = z.infer<
  typeof threatIntelIndicatorTypeSchema
>;

export const threatIntelVerdictSchema = z.enum([
  "clean",
  "unknown",
  "suspicious",
  "malicious",
]);

export type ThreatIntelVerdict = z.infer<typeof threatIntelVerdictSchema>;

export const threatIntelSourceSchema = z.object({
  name: z.string().min(1),
  verdict: z.string().min(1),
});

export const threatIntelResultSchema = z.object({
  indicator: z.string().min(1),
  type: threatIntelIndicatorTypeSchema,
  verdict: threatIntelVerdictSchema,
  sources: z.array(threatIntelSourceSchema),
});

export type ThreatIntelResult = z.infer<typeof threatIntelResultSchema>;
