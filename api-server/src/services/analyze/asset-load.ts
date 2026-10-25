/**
 * Loads uploaded analysis assets from object storage.
 */
import { HTTPException } from "hono/http-exception";
import type { Asset } from "../../schemas/asset.js";
import { findAssetById } from "../asset.repository.js";
import { readObjectBytes } from "../../storage/s3.js";

export async function getReadyAsset(assetId: string): Promise<Asset> {
  const asset = await findAssetById(assetId);
  if (!asset) {
    throw new HTTPException(404, { message: `Asset not found: ${assetId}` });
  }
  if (asset.status !== "uploaded" && asset.status !== "ready") {
    throw new HTTPException(400, {
      message: `Asset ${assetId} is not ready (status: ${asset.status})`,
    });
  }
  return asset;
}

export async function getReadyAssetBytes(
  assetId: string,
): Promise<{ asset: Asset; bytes: Uint8Array }> {
  const asset = await getReadyAsset(assetId);
  const bytes = await readObjectBytes(asset.objectKey);
  if (!bytes) {
    throw new HTTPException(404, {
      message: `Asset object missing in storage: ${assetId}`,
    });
  }
  return { asset, bytes };
}
