import type { CheckStatus } from "../../schemas/check.js";

const SECONDS_PER_HOUR = 3600;

const REDIS_URL_BASE_TTL: Record<CheckStatus, number> = {
  safe: 4 * SECONDS_PER_HOUR,
  warning: 2 * SECONDS_PER_HOUR,
  danger: SECONDS_PER_HOUR,
};

const REDIS_DOMAIN_BASE_TTL = 24 * SECONDS_PER_HOUR;

const REDIS_URL_MAX_TTL = 96 * SECONDS_PER_HOUR;
const REDIS_DOMAIN_MAX_TTL = 192 * SECONDS_PER_HOUR;

export function hitCountMultiplier(hitCount: number): number {
  if (hitCount >= 100) return 4;
  if (hitCount >= 10) return 2;
  return 1;
}

export function redisUrlTtlSeconds(
  status: CheckStatus,
  hitCount: number,
): number {
  const base = REDIS_URL_BASE_TTL[status];
  const scaled = base * hitCountMultiplier(hitCount);
  return Math.min(scaled, REDIS_URL_MAX_TTL);
}

export function redisDomainTtlSeconds(hitCount: number): number {
  const scaled = REDIS_DOMAIN_BASE_TTL * hitCountMultiplier(hitCount);
  return Math.min(scaled, REDIS_DOMAIN_MAX_TTL);
}

export type DomainCacheEntry = {
  hostname: string;
  status: CheckStatus;
  score: number;
  reasons: string[];
  checkedAt: string;
};

export function canUseDomainFallback(
  entry: DomainCacheEntry | null | undefined,
): boolean {
  return entry?.status === "safe";
}
