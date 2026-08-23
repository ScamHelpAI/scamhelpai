import { z } from "zod";
import { analysisContextSchema } from "./analysis-input.js";
import { timestampSchema } from "./shared.js";

export const checkStatusSchema = z.enum(["safe", "warning", "danger"]);

export type CheckStatus = z.infer<typeof checkStatusSchema>;

export const checkUrlRequestSchema = z.object({
  url: z.url(),
  context: analysisContextSchema.optional(),
});

export type CheckUrlRequest = z.infer<typeof checkUrlRequestSchema>;

export const checkUrlResultSchema = z.object({
  url: z.url(),
  status: checkStatusSchema,
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  checkedAt: timestampSchema,
  cached: z.boolean(),
});

export type CheckUrlResult = z.infer<typeof checkUrlResultSchema>;

export const checkUrlsRequestSchema = z.object({
  urls: z.array(z.url()).min(1).max(100),
  context: analysisContextSchema.optional(),
});

export type CheckUrlsRequest = z.infer<typeof checkUrlsRequestSchema>;

export const checkUrlsResponseSchema = z.object({
  results: z.array(checkUrlResultSchema),
});

export type CheckUrlsResponse = z.infer<typeof checkUrlsResponseSchema>;
