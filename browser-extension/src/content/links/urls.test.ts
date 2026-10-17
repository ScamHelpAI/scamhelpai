import { describe, expect, it } from "vitest";
import { chunkUrls } from "../../shared/check.ts";
import { normalizeHttpUrl } from "./urls.ts";

describe("normalizeHttpUrl", () => {
  it("keeps http and https urls", () => {
    expect(normalizeHttpUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(normalizeHttpUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("rejects non-http schemes", () => {
    expect(normalizeHttpUrl("mailto:a@b.com")).toBeNull();
    expect(normalizeHttpUrl("javascript:void(0)")).toBeNull();
    expect(normalizeHttpUrl("ftp://files.example")).toBeNull();
  });
});

describe("chunkUrls", () => {
  it("splits into fixed-size batches", () => {
    expect(chunkUrls(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });
});
