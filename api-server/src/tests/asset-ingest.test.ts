import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../services/analyze/asset-load.js", () => ({
  getReadyAssetBytes: vi.fn(),
}));

vi.mock("../tools/scan-file.js", () => ({
  scanFile: vi.fn(async () => ({
    filename: "shot.png",
    mimeType: "image/png",
    size: 100,
    hashes: { sha256: "abc", md5: "def" },
    embeddedUrls: [],
    hasMacros: false,
    malwareScan: null,
  })),
}));

vi.mock("../tools/decode-qr.js", () => ({
  decodeQr: vi.fn(async () => ({
    decoded: false,
    payloads: [],
    destinations: [],
  })),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({
    text: "Pay now at evil.example",
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
  })),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

import { getReadyAssetBytes } from "../services/analyze/asset-load.js";
import { ingestAssetInputs } from "../services/analyze/asset-ingest.js";
import { createSequentialId } from "../services/analyze/ids.js";

const getReadyAssetBytesMock = vi.mocked(getReadyAssetBytes);

describe("ingestAssetInputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReadyAssetBytesMock.mockResolvedValue({
      asset: {
        id: "asset-1",
        objectKey: "assets/asset-1",
        contentType: "image/png",
        status: "ready",
        createdAt: new Date().toISOString(),
        metadata: { filename: "shot.png" },
      },
      bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
    });
  });

  it("returns extracted text and ingest evidences for images", async () => {
    const createdAt = new Date().toISOString();
    const nextId = createSequentialId("ev");
    const result = await ingestAssetInputs(
      {
        inputs: [{ type: "image", assetId: "asset-1" }],
      },
      nextId,
      createdAt,
    );

    expect(result.extractedTextByInputIndex.get(0)).toBe(
      "Pay now at evil.example",
    );
    expect(result.evidences.length).toBeGreaterThanOrEqual(2);
    expect(
      result.evidences.some((item) => item.toolName === "scan_file"),
    ).toBe(true);
    expect(
      result.evidences.some((item) => item.toolName === "ingest_image"),
    ).toBe(true);
  });
});
