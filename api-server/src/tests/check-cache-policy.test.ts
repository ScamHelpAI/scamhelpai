import { describe, expect, it } from "vitest";
import {
  hitCountMultiplier,
  redisDomainTtlSeconds,
  redisUrlTtlSeconds,
  shouldPersistUrlToPostgres,
} from "../services/quick-analyze/check-cache-policy.js";

describe("hitCountMultiplier", () => {
  it("scales ttl tiers by popularity", () => {
    expect(hitCountMultiplier(1)).toBe(1);
    expect(hitCountMultiplier(10)).toBe(2);
    expect(hitCountMultiplier(100)).toBe(4);
  });
});

describe("redisUrlTtlSeconds", () => {
  it("applies popularity multiplier without exceeding max ttl", () => {
    expect(redisUrlTtlSeconds("safe", 100)).toBe(4 * 3600);
    expect(redisUrlTtlSeconds("safe", 100)).toBeLessThanOrEqual(24 * 3600);
  });
});

describe("redisDomainTtlSeconds", () => {
  it("applies popularity multiplier without exceeding max ttl", () => {
    expect(redisDomainTtlSeconds(100)).toBe(24 * 3600);
    expect(redisDomainTtlSeconds(100)).toBeLessThanOrEqual(48 * 3600);
  });
});

describe("shouldPersistUrlToPostgres", () => {
  it("always persists warning and danger", () => {
    expect(
      shouldPersistUrlToPostgres({
        status: "warning",
        hitCount: 1,
        domainHitCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldPersistUrlToPostgres({
        status: "danger",
        hitCount: 1,
        domainHitCount: 0,
      }),
    ).toBe(true);
  });

  it("persists safe urls only when popular enough", () => {
    expect(
      shouldPersistUrlToPostgres({
        status: "safe",
        hitCount: 2,
        domainHitCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldPersistUrlToPostgres({
        status: "safe",
        hitCount: 3,
        domainHitCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldPersistUrlToPostgres({
        status: "safe",
        hitCount: 1,
        domainHitCount: 20,
      }),
    ).toBe(true);
  });
});
