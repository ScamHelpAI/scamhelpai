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
  shouldPersistUrlToPostgres,
} from "./check-cache-policy.js";
import {
  bumpDomainHitCount,
  bumpUrlHitCount,
  getDomainCheckFromPostgres,
  getUrlCheckFromPostgres,
  pruneExpiredCheckCache,
  upsertDomainCheckCache,
  upsertUrlCheckCache,
} from "./check-cache.repository.js";

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

async function getRedisHitCount(key: string): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return 0;
  const value = await redis.get(key);
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function incrementRedisHitCount(key: string): Promise<number> {
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
  void pruneExpiredCheckCache();

  const urlHash = urlCheckHash(normalizedUrl);
  const hostname = hostnameFromCheckUrl(normalizedUrl);

  const redisUrl = await readUrlFromRedis(urlHash);
  if (redisUrl) {
    const hits = await incrementRedisHitCount(redisUrlHitsKey(urlHash));
    void bumpUrlHitCount(urlHash).catch(() => undefined);
    await writeUrlToRedis(urlHash, redisUrl, hits);
    return redisUrl;
  }

  const pgUrl = await getUrlCheckFromPostgres(urlHash);
  if (pgUrl) {
    const result = rowToCheckUrlResult(normalizedUrl, pgUrl);
    const hits = await incrementRedisHitCount(redisUrlHitsKey(urlHash));
    const pgHits = await bumpUrlHitCount(urlHash);
    const effectiveHits = Math.max(hits, pgHits);
    await writeUrlToRedis(urlHash, result, effectiveHits);
    return result;
  }

  const redisDomain = await readDomainFromRedis(hostname);
  if (redisDomain && canUseDomainFallback(redisDomain)) {
    const hits = await incrementRedisHitCount(redisDomainHitsKey(hostname));
    void bumpDomainHitCount(hostname).catch(() => undefined);
    await writeDomainToRedis(redisDomain, hits);
    return rowToCheckUrlResult(normalizedUrl, redisDomain);
  }

  const pgDomain = await getDomainCheckFromPostgres(hostname);
  if (pgDomain && canUseDomainFallback(pgDomain)) {
    const entry: DomainCacheEntry = {
      hostname: pgDomain.hostname,
      status: pgDomain.status,
      score: pgDomain.score,
      reasons: pgDomain.reasons,
      checkedAt: pgDomain.checkedAt,
    };
    const hits = await incrementRedisHitCount(redisDomainHitsKey(hostname));
    const pgHits = await bumpDomainHitCount(hostname);
    const effectiveHits = Math.max(hits, pgHits);
    await writeDomainToRedis(entry, effectiveHits);
    return rowToCheckUrlResult(normalizedUrl, pgDomain);
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

  const urlHits = await incrementRedisHitCount(redisUrlHitsKey(urlHash));
  const domainHits = await incrementRedisHitCount(redisDomainHitsKey(hostname));
  const pgDomain = await getDomainCheckFromPostgres(hostname);
  const domainHitCount = Math.max(domainHits, pgDomain?.hitCount ?? 0);

  const freshResult: CheckUrlResult = {
    ...params.result,
    url: params.normalizedUrl,
    cached: false,
  };

  await writeUrlToRedis(
    urlHash,
    { ...freshResult, cached: true },
    urlHits,
  );

  if (
    shouldPersistUrlToPostgres({
      status: freshResult.status,
      hitCount: urlHits,
      domainHitCount,
    })
  ) {
    await upsertUrlCheckCache({
      urlHash,
      url: params.normalizedUrl,
      hostname,
      status: freshResult.status,
      score: freshResult.score,
      reasons: freshResult.reasons,
      checkedAt: freshResult.checkedAt,
      hitCount: urlHits,
    });
  }

  await upsertDomainCheckCache({
    hostname: params.domainEntry.hostname,
    status: params.domainEntry.status,
    score: params.domainEntry.score,
    reasons: params.domainEntry.reasons,
    checkedAt: params.domainEntry.checkedAt,
    hitCount: domainHitCount,
  });

  if (params.domainEntry.status === "safe") {
    await writeDomainToRedis(params.domainEntry, domainHitCount);
  }

  return freshResult;
}
