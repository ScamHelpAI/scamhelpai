import { Hono } from "hono";
import {
  completeAssetHandler,
  getAssetHandler,
  presignAssetHandler,
} from "../handlers/asset.handler.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const assetRoutes = new Hono();

// Uploads create storage objects; moderate write limits.
assetRoutes.post(
  "/presign",
  rateLimit({ name: "asset-presign", limit: 20 }),
  presignAssetHandler,
);
assetRoutes.post(
  "/:assetId/complete",
  rateLimit({ name: "asset-complete", limit: 20 }),
  completeAssetHandler,
);

assetRoutes.get(
  "/:assetId",
  rateLimit({ name: "asset-get", limit: 60 }),
  getAssetHandler,
);
