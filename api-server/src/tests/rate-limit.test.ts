import { describe, expect, it } from "vitest";
import {
  MemoryRateLimitStore,
  dailyRateLimitKey,
} from "../middleware/rate-limit.js";

describe("MemoryRateLimitStore", () => {
  it("counts hits within the window", () => {
    const store = new MemoryRateLimitStore();
    const windowMs = 60_000;

    const first = store.hit("a", windowMs);
    const second = store.hit("a", windowMs);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(second.resetAt).toBe(first.resetAt);
  });

  it("isolates keys", () => {
    const store = new MemoryRateLimitStore();
    store.hit("a", 60_000);
    const other = store.hit("b", 60_000);
    expect(other.count).toBe(1);
  });
});

describe("dailyRateLimitKey", () => {
  it("namespaces by route and client", () => {
    expect(dailyRateLimitKey("analyze-create", "1.2.3.4")).toBe(
      "ratelimit:daily:analyze-create:1.2.3.4",
    );
  });
});

