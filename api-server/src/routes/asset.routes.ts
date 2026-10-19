import { Hono } from "hono";
import {
  completeAssetHandler,
  getAssetHandler,
  presignAssetHandler,
} from "../handlers/asset.handler.js";

export const assetRoutes = new Hono();

assetRoutes.post("/presign", presignAssetHandler);
assetRoutes.post("/:assetId/complete", completeAssetHandler);
assetRoutes.get("/:assetId", getAssetHandler);
