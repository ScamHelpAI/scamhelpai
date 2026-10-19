import { describe, expect, it } from "vitest";
import {
  hostnameFromCheckUrl,
  normalizeCheckUrl,
  urlCheckHash,
} from "../services/check-cache-key.js";

describe("normalizeCheckUrl", () => {
  it("lowercases host and strips hash", () => {
    expect(
      normalizeCheckUrl("https://EXAMPLE.com/path?q=1#section"),
    ).toBe("https://example.com/path?q=1");
  });

  it("drops default https port", () => {
    expect(normalizeCheckUrl("https://example.com:443/a")).toBe(
      "https://example.com/a",
    );
  });
});

describe("hostnameFromCheckUrl", () => {
  it("strips www prefix", () => {
    expect(hostnameFromCheckUrl("https://www.example.com/x")).toBe("example.com");
  });
});

describe("urlCheckHash", () => {
  it("is stable for the same normalized url", () => {
    const url = normalizeCheckUrl("https://example.com/a");
    expect(urlCheckHash(url)).toBe(urlCheckHash(url));
  });
});
