import { describe, expect, it, vi } from "vitest";
import { HTTPException } from "hono/http-exception";
import {
  assertAnalysisAssetsReady,
  listAnalysisAssetIds,
} from "../services/analyze/asset-validate.js";

vi.mock("../services/asset.repository.js", () => ({
  findAssetById: vi.fn(),
}));

import { findAssetById } from "../services/asset.repository.js";

const findAssetByIdMock = vi.mocked(findAssetById);

describe("listAnalysisAssetIds", () => {
  it("deduplicates asset ids from multimodal inputs", () => {
    const ids = listAnalysisAssetIds({
      inputs: [
        { type: "image", assetId: "a1" },
        { type: "pdf", assetId: "a1" },
        { type: "text", content: "hi" },
      ],
    });
    expect(ids).toEqual(["a1"]);
  });
});

describe("assertAnalysisAssetsReady", () => {
  it("throws when asset is missing", async () => {
    findAssetByIdMock.mockResolvedValueOnce(null);

    await expect(
      assertAnalysisAssetsReady({
        inputs: [{ type: "image", assetId: "missing" }],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws when asset is still pending", async () => {
    findAssetByIdMock.mockResolvedValueOnce({
      id: "a1",
      objectKey: "assets/a1",
      contentType: "image/png",
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    await expect(
      assertAnalysisAssetsReady({
        inputs: [{ type: "image", assetId: "a1" }],
      }),
    ).rejects.toBeInstanceOf(HTTPException);
  });

  it("throws when content type does not match input", async () => {
    findAssetByIdMock.mockResolvedValueOnce({
      id: "a1",
      objectKey: "assets/a1",
      contentType: "application/pdf",
      status: "ready",
      createdAt: new Date().toISOString(),
    });

    await expect(
      assertAnalysisAssetsReady({
        inputs: [{ type: "image", assetId: "a1" }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("accepts ready assets with matching types", async () => {
    findAssetByIdMock.mockResolvedValueOnce({
      id: "a1",
      objectKey: "assets/a1",
      contentType: "image/png",
      status: "uploaded",
      createdAt: new Date().toISOString(),
    });

    await expect(
      assertAnalysisAssetsReady({
        inputs: [{ type: "image", assetId: "a1" }],
      }),
    ).resolves.toBeUndefined();
  });
});
