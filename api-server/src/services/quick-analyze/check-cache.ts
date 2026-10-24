/**
 * Redis-only cache for quick URL checks. Misses (or Redis down) fall through
 * to a live lookup. Safe domain results can answer a new URL on the same host.
 */
import { getRedisClient } from "../../cache/redis.js";
import type { CheckUrlResult } from "../../schemas/check.js";
import {
  hostnameFromCheckUrl,
  redisDomainHitsKey,
  redisDomainKey,
  redisUrlHitsKey,
  redisUrlKey,
  urlCheckHash,
} from "./check-cache-key.js";
import {
  canUseDomainFallback,
  type DomainCacheEntry,
  redisDomainTtlSeconds,
  redisUrlTtlSeconds,
} from "./check-cache-policy.js";

function rowToCheckUrlResult(
  url: string,
  row: {
    status: CheckUrlResult["status"];
    score: number;
    reasons: string[];
    checkedAt: string;
  },
): CheckUrlResult {
  return {
    url,
    status: row.status,
    score: row.score,
    reasons: row.reasons,
    checkedAt: row.checkedAt,
    cached: true,
  };
}

async function incrementHitCount(key: string): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return 0;
  return redis.incr(key);
}

async function readUrlFromRedis(
  urlHash: string,
): Promise<CheckUrlResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  const raw = await redis.get(redisUrlKey(urlHash));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CheckUrlResult;
    return { ...parsed, cached: true };
  } catch {
    return null;
  }
}

async function writeUrlToRedis(
  urlHash: string,
  result: CheckUrlResult,
  hitCount: number,
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  const ttl = redisUrlTtlSeconds(result.status, hitCount);
  await redis.setEx(redisUrlKey(urlHash), ttl, JSON.stringify(result));
}

async function readDomainFromRedis(
  hostname: string,
): Promise<DomainCacheEntry | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  const raw = await redis.get(redisDomainKey(hostname));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DomainCacheEntry;
  } catch {
    return null;
  }
}

async function writeDomainToRedis(
  entry: DomainCacheEntry,
  hitCount: number,
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  const ttl = redisDomainTtlSeconds(hitCount);
  await redis.setEx(redisDomainKey(entry.hostname), ttl, JSON.stringify(entry));
}

export async function getCachedCheckUrl(
  normalizedUrl: string,
): Promise<CheckUrlResult | null> {
  const urlHash = urlCheckHash(normalizedUrl);
  const hostname = hostnameFromCheckUrl(normalizedUrl);

  const redisUrl = await readUrlFromRedis(urlHash);
  if (redisUrl) {
    const hits = await incrementHitCount(redisUrlHitsKey(urlHash));
    await writeUrlToRedis(urlHash, redisUrl, hits);
    return redisUrl;
  }

  const redisDomain = await readDomainFromRedis(hostname);
  if (redisDomain && canUseDomainFallback(redisDomain)) {
    const hits = await incrementHitCount(redisDomainHitsKey(hostname));
    await writeDomainToRedis(redisDomain, hits);
    return rowToCheckUrlResult(normalizedUrl, redisDomain);
  }

  return null;
}

export async function storeCheckUrlResult(params: {
  normalizedUrl: string;
  result: Omit<CheckUrlResult, "cached">;
  domainEntry: DomainCacheEntry;
}): Promise<CheckUrlResult> {
  const urlHash = urlCheckHash(params.normalizedUrl);
  const hostname = hostnameFromCheckUrl(params.normalizedUrl);

  const urlHits = await incrementHitCount(redisUrlHitsKey(urlHash));
  const domainHits = await incrementHitCount(redisDomainHitsKey(hostname));

  const freshResult: CheckUrlResult = {
    ...params.result,
    url: params.normalizedUrl,
    cached: false,
  };

  await writeUrlToRedis(urlHash, { ...freshResult, cached: true }, urlHits);

  if (params.domainEntry.status === "safe") {
    await writeDomainToRedis(params.domainEntry, domainHits);
  }

  return freshResult;
}
