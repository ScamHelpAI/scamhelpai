import { tool } from "ai";
import { z } from "zod";
import { getReadyAssetBytes } from "../services/analyze/asset-load.js";

const MAX_TOOL_BYTES = 4 * 1024 * 1024;

export function createLoadSubmissionAssetTool(allowedAssetIds: string[]) {
  const allowed = new Set(allowedAssetIds);

  return tool({
    description:
      "Loads a submission asset by id from storage. Returns base64 content for scan_file or decode_qr. Only assets included in this analysis can be loaded.",
    inputSchema: z.object({
      assetId: z.string().min(1).describe("Asset id from the submission inputs"),
    }),
    execute: async ({ assetId }) => {
      if (!allowed.has(assetId)) {
        throw new Error("Asset is not part of this submission");
      }

      const { asset, bytes } = await getReadyAssetBytes(assetId);
      if (bytes.length > MAX_TOOL_BYTES) {
        throw new Error(
          `Asset too large for tool payload (${bytes.length} bytes; max ${MAX_TOOL_BYTES})`,
        );
      }

      return {
        assetId,
        contentType: asset.contentType,
        size: bytes.length,
        base64: Buffer.from(bytes).toString("base64"),
      };
    },
  });
}
