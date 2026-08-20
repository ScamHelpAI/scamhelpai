import { z } from "zod";
import { idSchema, timestampSchema } from "./shared.js";

export const assetStatusSchema = z.enum([
  "pending",
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetMetadataSchema = z.object({
  filename: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
});

export type AssetMetadata = z.infer<typeof assetMetadataSchema>;

export const assetSchema = z.object({
  id: idSchema,
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  status: assetStatusSchema,
  createdAt: timestampSchema,
  uploadedAt: timestampSchema.optional(),
  metadata: assetMetadataSchema.optional(),
});

export type Asset = z.infer<typeof assetSchema>;

export const presignAssetRequestSchema = z.object({
  contentType: z.string().min(1),
  filename: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export type PresignAssetRequest = z.infer<typeof presignAssetRequestSchema>;

export const presignAssetResponseSchema = z.object({
  assetId: idSchema,
  uploadUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
  requiredHeaders: z.record(z.string(), z.string()).optional(),
});

export type PresignAssetResponse = z.infer<typeof presignAssetResponseSchema>;
