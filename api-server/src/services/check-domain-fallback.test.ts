import { describe, expect, it } from "vitest";
import {
  canUseDomainFallback,
  type DomainCacheEntry,
} from "./check-cache-policy.js";

describe("canUseDomainFallback", () => {
  const base: DomainCacheEntry = {
    hostname: "example.com",
    status: "safe",
    score: 5,
    reasons: ["No significant risk signals detected."],
    checkedAt: new Date().toISOString(),
  };

  it("allows safe domains", () => {
    expect(canUseDomainFallback(base)).toBe(true);
  });

  it("rejects warning and danger domains", () => {
    expect(canUseDomainFallback({ ...base, status: "warning" })).toBe(false);
    expect(canUseDomainFallback({ ...base, status: "danger" })).toBe(false);
  });

  it("rejects missing entries", () => {
    expect(canUseDomainFallback(null)).toBe(false);
    expect(canUseDomainFallback(undefined)).toBe(false);
  });
});
