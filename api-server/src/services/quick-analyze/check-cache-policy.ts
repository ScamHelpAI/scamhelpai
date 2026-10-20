import type { CheckStatus } from "../schemas/check.js";

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

const REDIS_URL_BASE_TTL: Record<CheckStatus, number> = {
  safe: SECONDS_PER_HOUR,
  warning: 30 * 60,
  danger: 15 * 60,
};

const REDIS_DOMAIN_BASE_TTL = 6 * SECONDS_PER_HOUR;

const REDIS_URL_MAX_TTL = 24 * SECONDS_PER_HOUR;
const REDIS_DOMAIN_MAX_TTL = 48 * SECONDS_PER_HOUR;

const POSTGRES_URL_RETENTION: Record<CheckStatus, number> = {
  safe: 7 * SECONDS_PER_DAY,
  warning: 2 * SECONDS_PER_DAY,
  danger: SECONDS_PER_DAY,
};

const POSTGRES_DOMAIN_RETENTION = 14 * SECONDS_PER_DAY;

export function hitCountMultiplier(hitCount: number): number {
  if (hitCount >= 100) return 4;
  if (hitCount >= 10) return 2;
  return 1;
}

export function redisUrlTtlSeconds(status: CheckStatus, hitCount: number): number {
  const base = REDIS_URL_BASE_TTL[status];
  const scaled = base * hitCountMultiplier(hitCount);
  return Math.min(scaled, REDIS_URL_MAX_TTL);
}

export function redisDomainTtlSeconds(hitCount: number): number {
  const scaled = REDIS_DOMAIN_BASE_TTL * hitCountMultiplier(hitCount);
  return Math.min(scaled, REDIS_DOMAIN_MAX_TTL);
}

export function postgresUrlExpiresAt(
  status: CheckStatus,
  from: Date = new Date(),
): Date {
  return new Date(from.getTime() + POSTGRES_URL_RETENTION[status] * 1000);
}

export function postgresDomainExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + POSTGRES_DOMAIN_RETENTION * 1000);
}

export function shouldPersistUrlToPostgres(params: {
  status: CheckStatus;
  hitCount: number;
  domainHitCount: number;
}): boolean {
  if (params.status === "warning" || params.status === "danger") {
    return true;
  }
  return params.hitCount >= 3 || params.domainHitCount >= 20;
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
