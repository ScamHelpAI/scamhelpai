import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/index.js", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../services/asset.repository.js", () => ({
  listAssetsForAnalysis: vi.fn(),
  deleteAssetById: vi.fn(),
}));

vi.mock("../storage/s3.js", () => ({
  isS3Configured: vi.fn(() => true),
  deleteObject: vi.fn(),
}));

import { db } from "../db/index.js";
import {
  purgeAnalysisAssetsIfEligible,
  shouldPurgeAssetsForRisk,
} from "../services/analyze/asset-purge.js";
import {
  deleteAssetById,
  listAssetsForAnalysis,
} from "../services/asset.repository.js";
import { deleteObject } from "../storage/s3.js";

const listAssetsForAnalysisMock = vi.mocked(listAssetsForAnalysis);
const deleteAssetByIdMock = vi.mocked(deleteAssetById);
const deleteObjectMock = vi.mocked(deleteObject);

function mockDbDeleteReturning(rows: Array<{ id: string }>) {
  vi.mocked(db.delete).mockReturnValueOnce({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(rows),
    }),
  } as never);
}

describe("shouldPurgeAssetsForRisk", () => {
  it("purges low and medium only", () => {
    expect(shouldPurgeAssetsForRisk("low")).toBe(true);
    expect(shouldPurgeAssetsForRisk("medium")).toBe(true);
    expect(shouldPurgeAssetsForRisk("high")).toBe(false);
    expect(shouldPurgeAssetsForRisk("critical")).toBe(false);
  });
});

describe("purgeAnalysisAssetsIfEligible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops for high risk", async () => {
    const result = await purgeAnalysisAssetsIfEligible("a1", "high");
    expect(result.purgedAssetIds).toEqual([]);
    expect(result.deletedInputs).toBe(0);
    expect(listAssetsForAnalysisMock).not.toHaveBeenCalled();
  });

  it("hard-deletes inputs and evidence, then deletes assets for low risk", async () => {
    mockDbDeleteReturning([{ id: "in-1" }]);
    mockDbDeleteReturning([{ id: "ev-1" }]);

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as never);

    listAssetsForAnalysisMock.mockResolvedValueOnce([
      {
        id: "asset-1",
        objectKey: "assets/asset-1",
        contentType: "image/png",
        status: "ready",
        createdAt: new Date().toISOString(),
      },
    ]);
    deleteAssetByIdMock.mockResolvedValueOnce(true);

    const result = await purgeAnalysisAssetsIfEligible("a1", "low");

    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(result.deletedInputs).toBe(1);
    expect(result.deletedEvidence).toBe(1);
    expect(deleteObjectMock).toHaveBeenCalledWith("assets/asset-1");
    expect(deleteAssetByIdMock).toHaveBeenCalledWith("asset-1");
    expect(result.purgedAssetIds).toEqual(["asset-1"]);
  });

  it("skips DB asset delete when S3 delete fails", async () => {
    mockDbDeleteReturning([]);
    mockDbDeleteReturning([]);
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as never);

    listAssetsForAnalysisMock.mockResolvedValueOnce([
      {
        id: "asset-1",
        objectKey: "assets/asset-1",
        contentType: "image/png",
        status: "ready",
        createdAt: new Date().toISOString(),
      },
    ]);
    deleteObjectMock.mockRejectedValueOnce(new Error("s3 down"));

    const result = await purgeAnalysisAssetsIfEligible("a1", "medium");

    expect(deleteAssetByIdMock).not.toHaveBeenCalled();
    expect(result.purgedAssetIds).toEqual([]);
  });
});
