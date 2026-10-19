import { describe, expect, it } from "vitest";
import {
  assertAllowedContentType,
  buildAssetObjectKey,
  isAllowedContentType,
  MAX_ASSET_BYTES,
} from "../services/asset-policy.js";

describe("isAllowedContentType", () => {
  it("allows common analysis upload types", () => {
    expect(isAllowedContentType("image/png")).toBe(true);
    expect(isAllowedContentType("image/jpeg")).toBe(true);
    expect(isAllowedContentType("application/pdf")).toBe(true);
    expect(isAllowedContentType("audio/mpeg")).toBe(true);
    expect(isAllowedContentType("message/rfc822")).toBe(true);
  });

  it("rejects unsupported types", () => {
    expect(isAllowedContentType("application/zip")).toBe(false);
    expect(isAllowedContentType("text/html")).toBe(false);
    expect(isAllowedContentType("")).toBe(false);
  });

  it("ignores parameters on the content type", () => {
    expect(isAllowedContentType("image/png; charset=binary")).toBe(true);
  });
});

describe("assertAllowedContentType", () => {
  it("throws for oversized uploads", () => {
    expect(() =>
      assertAllowedContentType("image/png", MAX_ASSET_BYTES + 1),
    ).toThrow(/too large/i);
  });
});

describe("buildAssetObjectKey", () => {
  it("nests under assets/ using the asset id only", () => {
    expect(buildAssetObjectKey("abc-123")).toBe("assets/abc-123");
  });
});
