/**
 * Rolling daily rate limit by client IP, backed by Redis INCR + EXPIRE.
 * Skips when Redis is unavailable so local/dev still works; short-window
 * limits remain the burst protection.
 */
import type { MiddlewareHandler } from "hono";
import { getRedisClient } from "../cache/redis.js";
import {
  clientKey,
  dailyRateLimitKey,
  rateLimitExceededResponse,
} from "./rate-limit.js";

export type DailyRateLimitOptions = {
  name: string;
  limit: number;
  /** Rolling window length; defaults to 24 hours. */
  windowSeconds?: number;
};

const DAY_SECONDS = 24 * 60 * 60;

export { dailyRateLimitKey };

export function dailyRateLimit(
  options: DailyRateLimitOptions,
): MiddlewareHandler {
  const windowSeconds = options.windowSeconds ?? DAY_SECONDS;

  return async (c, next) => {
    const redis = await getRedisClient();
    if (!redis) {
      await next();
      return;
    }

    const key = dailyRateLimitKey(options.name, clientKey(c));

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      const retryAfterSec = Math.max(1, ttl > 0 ? ttl : windowSeconds);
      const remaining = Math.max(0, options.limit - count);

      c.header("X-RateLimit-Daily-Limit", String(options.limit));
      c.header("X-RateLimit-Daily-Remaining", String(remaining));
      c.header(
        "X-RateLimit-Daily-Reset",
        String(Math.ceil(Date.now() / 1000) + retryAfterSec),
      );

      if (count > options.limit) {
        return rateLimitExceededResponse(c, {
          limit: options.limit,
          retryAfterSec,
          scope: "day",
        });
      }
    } catch (error) {
      console.error("[rate-limit] daily Redis check failed:", error);
    }

    await next();
  };
}
