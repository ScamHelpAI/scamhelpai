import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { presignAssetRequestSchema } from "../schemas/asset.js";
import {
  completeAssetUpload,
  getAsset,
  presignAsset,
} from "../services/asset.server.js";

export async function presignAssetHandler(c: Context) {
  const body = presignAssetRequestSchema.parse(await c.req.json());
  const result = await presignAsset(body);
  return c.json(result, 201);
}

export async function completeAssetHandler(c: Context) {
  const assetId = c.req.param("assetId");
  if (!assetId) {
    throw new HTTPException(400, { message: "Asset id is required" });
  }

  const asset = await completeAssetUpload(assetId);
  return c.json(asset);
}

export async function getAssetHandler(c: Context) {
  const assetId = c.req.param("assetId");
  if (!assetId) {
    throw new HTTPException(400, { message: "Asset id is required" });
  }

  const asset = await getAsset(assetId);
  return c.json(asset);
}
