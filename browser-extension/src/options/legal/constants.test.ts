import { describe, expect, it } from "vitest";
import { hashForLegalView, legalViewFromHash } from "./constants.ts";

describe("legalViewFromHash", () => {
  it("maps privacy and terms hashes", () => {
    expect(legalViewFromHash("#privacy")).toBe("privacy");
    expect(legalViewFromHash("terms")).toBe("terms");
    expect(legalViewFromHash("#TERMS")).toBe("terms");
  });

  it("defaults unknown hashes to settings", () => {
    expect(legalViewFromHash("")).toBe("settings");
    expect(legalViewFromHash("#other")).toBe("settings");
  });
});

describe("hashForLegalView", () => {
  it("returns stable hashes", () => {
    expect(hashForLegalView("privacy")).toBe("#privacy");
    expect(hashForLegalView("terms")).toBe("#terms");
    expect(hashForLegalView("settings")).toBe("");
  });
});
