/**
 * Asset upload flow: create a pending DB row + presigned PUT URL, then
 * confirm the object landed in S3/MinIO and mark the asset ready.
 */
import { HTTPException } from "hono/http-exception";
import type {
  Asset,
  PresignAssetRequest,
  PresignAssetResponse,
} from "../schemas/asset.js";
import {
  assertAllowedContentType,
  buildAssetObjectKey,
  PRESIGN_EXPIRES_IN_SECONDS,
} from "./asset-policy.js";
import {
  findAssetById,
  insertPendingAsset,
  markAssetUploaded,
} from "./asset.repository.js";
import {
  isS3Configured,
  objectExists,
  objectStat,
  presignPutObject,
} from "../storage/s3.js";

function requireS3(): void {
  if (!isS3Configured()) {
    throw new HTTPException(503, { message: "Object storage is not configured" });
  }
}

export async function presignAsset(
  request: PresignAssetRequest,
): Promise<PresignAssetResponse> {
  requireS3();

  let contentType: string;
  try {
    contentType = assertAllowedContentType(
      request.contentType,
      request.sizeBytes,
    );
  } catch (error) {
    throw new HTTPException(400, {
      message: error instanceof Error ? error.message : "Invalid asset request",
    });
  }

  const assetId = crypto.randomUUID();
  const objectKey = buildAssetObjectKey(assetId);
  const expiresIn = PRESIGN_EXPIRES_IN_SECONDS;

  await insertPendingAsset({
    id: assetId,
    objectKey,
    contentType,
    sizeBytes: request.sizeBytes,
    metadata: request.filename ? { filename: request.filename } : undefined,
  });

  const uploadUrl = presignPutObject({
    objectKey,
    contentType,
    expiresIn,
  });

  return {
    assetId,
    uploadUrl,
    expiresIn,
    requiredHeaders: {
      "Content-Type": contentType,
    },
  };
}

export async function completeAssetUpload(assetId: string): Promise<Asset> {
  requireS3();

  const asset = await findAssetById(assetId);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  if (asset.status === "ready" || asset.status === "uploaded") {
    return asset;
  }

  if (asset.status !== "pending") {
    throw new HTTPException(409, {
      message: `Asset cannot be completed from status ${asset.status}`,
    });
  }

  const exists = await objectExists(asset.objectKey);
  if (!exists) {
    throw new HTTPException(400, {
      message: "Upload not found in object storage. PUT the file to uploadUrl first.",
    });
  }

  const stat = await objectStat(asset.objectKey);
  const updated = await markAssetUploaded({
    id: assetId,
    sizeBytes: stat?.size ?? asset.sizeBytes,
    contentType: stat?.type || asset.contentType,
  });

  if (!updated) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  return updated;
}

export async function getAsset(assetId: string): Promise<Asset> {
  const asset = await findAssetById(assetId);
  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }
  return asset;
}
