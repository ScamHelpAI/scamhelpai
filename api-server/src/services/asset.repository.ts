/**
 * Persistence for uploaded analysis assets.
 */
import { eq } from "drizzle-orm";
import type { Asset, AssetMetadata } from "../schemas/asset.js";
import { assetMetadataSchema } from "../schemas/asset.js";
import { db } from "../db/index.js";
import { assets } from "../db/schema.js";

function toAsset(row: typeof assets.$inferSelect): Asset {
  let metadata: AssetMetadata | undefined;
  if (row.metadata != null) {
    const parsed = assetMetadataSchema.safeParse(row.metadata);
    if (parsed.success) metadata = parsed.data;
  }

  return {
    id: row.id,
    objectKey: row.objectKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    uploadedAt: row.uploadedAt ?? undefined,
    metadata,
  };
}

export async function insertPendingAsset(params: {
  id: string;
  objectKey: string;
  contentType: string;
  sizeBytes?: number;
  metadata?: AssetMetadata;
}): Promise<Asset> {
  const createdAt = new Date().toISOString();

  const [row] = await db
    .insert(assets)
    .values({
      id: params.id,
      objectKey: params.objectKey,
      contentType: params.contentType,
      sizeBytes: params.sizeBytes,
      status: "pending",
      createdAt,
      metadata: params.metadata ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to insert asset");
  }

  return toAsset(row);
}

export async function findAssetById(id: string): Promise<Asset | null> {
  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return row ? toAsset(row) : null;
}

export async function markAssetUploaded(params: {
  id: string;
  sizeBytes?: number;
  contentType?: string;
}): Promise<Asset | null> {
  const uploadedAt = new Date().toISOString();

  const [row] = await db
    .update(assets)
    .set({
      status: "ready",
      uploadedAt,
      ...(params.sizeBytes !== undefined ? { sizeBytes: params.sizeBytes } : {}),
      ...(params.contentType ? { contentType: params.contentType } : {}),
    })
    .where(eq(assets.id, params.id))
    .returning();

  return row ? toAsset(row) : null;
}
