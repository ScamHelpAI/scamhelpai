/**
 * Ensures analysis asset inputs reference uploaded, type-matching objects.
 */
import { HTTPException } from "hono/http-exception";
import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../../schemas/analysis-input.js";
import type { Asset } from "../../schemas/asset.js";
import { normalizeContentType } from "../asset-policy.js";
import { findAssetById } from "../asset.repository.js";

function assetIdsFromRequest(request: AnalyzeRequest): string[] {
  const ids: string[] = [];
  for (const input of request.inputs) {
    if (
      input.type === "image" ||
      input.type === "pdf" ||
      input.type === "audio"
    ) {
      ids.push(input.assetId);
    }
  }
  return ids;
}

function contentTypeMatchesInput(
  input: AnalysisInput,
  contentType: string,
): boolean {
  const normalized = normalizeContentType(contentType);
  switch (input.type) {
    case "image":
      return normalized.startsWith("image/");
    case "audio":
      return normalized.startsWith("audio/");
    case "pdf":
      return normalized === "application/pdf";
    default:
      return true;
  }
}

function assertAssetReady(asset: Asset, input: AnalysisInput): void {
  if (asset.status !== "uploaded" && asset.status !== "ready") {
    throw new HTTPException(400, {
      message: `Asset ${asset.id} is not ready for analysis (status: ${asset.status})`,
    });
  }

  if (!contentTypeMatchesInput(input, asset.contentType)) {
    throw new HTTPException(400, {
      message: `Asset ${asset.id} content type ${asset.contentType} does not match input type ${input.type}`,
    });
  }
}

export async function assertAnalysisAssetsReady(
  request: AnalyzeRequest,
): Promise<void> {
  for (const input of request.inputs) {
    if (
      input.type !== "image" &&
      input.type !== "pdf" &&
      input.type !== "audio"
    ) {
      continue;
    }

    const asset = await findAssetById(input.assetId);
    if (!asset) {
      throw new HTTPException(404, {
        message: `Asset not found: ${input.assetId}`,
      });
    }

    assertAssetReady(asset, input);
  }
}

export function listAnalysisAssetIds(request: AnalyzeRequest): string[] {
  return [...new Set(assetIdsFromRequest(request))];
}
