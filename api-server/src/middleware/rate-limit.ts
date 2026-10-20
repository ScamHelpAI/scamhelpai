/**
 * In-memory per-route fixed-window rate limiting by client IP.
 * Fine for a single-server deployment.
 */
import type { Context, MiddlewareHandler } from "hono";

export type RateLimitOptions = {
  /** Distinct bucket name so each route has its own counter. */
  name: string;
  limit: number;
  windowMs?: number;
};

type MemoryEntry = {
  count: number;
  resetAt: number;
};

export class MemoryRateLimitStore {
  private readonly entries = new Map<string, MemoryEntry>();

  hit(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.entries.set(key, entry);
      return { count: entry.count, resetAt: entry.resetAt };
    }

    existing.count += 1;
    return { count: existing.count, resetAt: existing.resetAt };
  }
}

const store = new MemoryRateLimitStore();

function clientKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const windowMs = options.windowMs ?? 60_000;

  return async (c, next) => {
    const key = `${options.name}:${clientKey(c)}`;
    const { count, resetAt } = store.hit(key, windowMs);
    const remaining = Math.max(0, options.limit - count);
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

    c.header("X-RateLimit-Limit", String(options.limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (count > options.limit) {
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        {
          error: "rate_limit_exceeded",
          limit: options.limit,
          retryAfter: retryAfterSec,
        },
        429,
      );
    }

    await next();
  };
}
