import { z } from "zod";
import { idSchema } from "./shared.js";

export const analysisSourceSchema = z.enum([
  "browser_extension",
  "web_app",
  "mobile_app",
  "api",
]);

export type AnalysisSource = z.infer<typeof analysisSourceSchema>;

export const analysisContextSchema = z.object({
  source: analysisSourceSchema.optional(),
  pageUrl: z.string().url().optional(),
  referrer: z.string().optional(),
  locale: z.string().optional(),
});

export type AnalysisContext = z.infer<typeof analysisContextSchema>;

export const analysisInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("url"),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("image"),
    assetId: idSchema,
  }),
  z.object({
    type: z.literal("audio"),
    assetId: idSchema,
  }),
  z.object({
    type: z.literal("pdf"),
    assetId: idSchema,
  }),
  z.object({
    type: z.literal("email"),
    raw: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
    assetIds: z.array(idSchema).optional(),
  }),
]);

export type AnalysisInput = z.infer<typeof analysisInputSchema>;

export const analyzeRequestSchema = z.object({
  inputs: z.array(analysisInputSchema).min(1),
  context: analysisContextSchema.optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
