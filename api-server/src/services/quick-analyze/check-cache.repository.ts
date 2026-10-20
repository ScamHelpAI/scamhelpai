import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { domainCheckCache, urlCheckCache } from "../../db/schema.js";
import type { CheckStatus } from "../../schemas/check.js";
import {
  postgresDomainExpiresAt,
  postgresUrlExpiresAt,
} from "./check-cache-policy.js";

export type UrlCacheRow = {
  urlHash: string;
  url: string;
  hostname: string;
  status: CheckStatus;
  score: number;
  reasons: string[];
  hitCount: number;
  checkedAt: string;
  expiresAt: string;
};

export type DomainCacheRow = {
  hostname: string;
  status: CheckStatus;
  score: number;
  reasons: string[];
  hitCount: number;
  checkedAt: string;
  expiresAt: string;
};

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function getUrlCheckFromPostgres(
  urlHash: string,
): Promise<UrlCacheRow | null> {
  const row = await db.query.urlCheckCache.findFirst({
    where: eq(urlCheckCache.urlHash, urlHash),
  });
  if (!row || isExpired(row.expiresAt)) return null;
  return {
    urlHash: row.urlHash,
    url: row.url,
    hostname: row.hostname,
    status: row.status,
    score: row.score,
    reasons: row.reasons,
    hitCount: row.hitCount,
    checkedAt: row.checkedAt,
    expiresAt: row.expiresAt,
  };
}

export async function getDomainCheckFromPostgres(
  hostname: string,
): Promise<DomainCacheRow | null> {
  const row = await db.query.domainCheckCache.findFirst({
    where: eq(domainCheckCache.hostname, hostname),
  });
  if (!row || isExpired(row.expiresAt)) return null;
  return {
    hostname: row.hostname,
    status: row.status,
    score: row.score,
    reasons: row.reasons,
    hitCount: row.hitCount,
    checkedAt: row.checkedAt,
    expiresAt: row.expiresAt,
  };
}

export async function bumpUrlHitCount(urlHash: string): Promise<number> {
  const [row] = await db
    .update(urlCheckCache)
    .set({
      hitCount: sql`${urlCheckCache.hitCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(urlCheckCache.urlHash, urlHash))
    .returning({ hitCount: urlCheckCache.hitCount });

  return row?.hitCount ?? 0;
}

export async function bumpDomainHitCount(hostname: string): Promise<number> {
  const [row] = await db
    .update(domainCheckCache)
    .set({
      hitCount: sql`${domainCheckCache.hitCount} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(domainCheckCache.hostname, hostname))
    .returning({ hitCount: domainCheckCache.hitCount });

  return row?.hitCount ?? 0;
}

export async function upsertUrlCheckCache(params: {
  urlHash: string;
  url: string;
  hostname: string;
  status: CheckStatus;
  score: number;
  reasons: string[];
  checkedAt: string;
  hitCount: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = postgresUrlExpiresAt(params.status).toISOString();

  await db
    .insert(urlCheckCache)
    .values({
      urlHash: params.urlHash,
      url: params.url,
      hostname: params.hostname,
      status: params.status,
      score: params.score,
      reasons: params.reasons,
      hitCount: params.hitCount,
      checkedAt: params.checkedAt,
      expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: urlCheckCache.urlHash,
      set: {
        url: params.url,
        hostname: params.hostname,
        status: params.status,
        score: params.score,
        reasons: params.reasons,
        hitCount: params.hitCount,
        checkedAt: params.checkedAt,
        expiresAt,
        updatedAt: now,
      },
    });
}

export async function upsertDomainCheckCache(params: {
  hostname: string;
  status: CheckStatus;
  score: number;
  reasons: string[];
  checkedAt: string;
  hitCount: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = postgresDomainExpiresAt().toISOString();

  await db
    .insert(domainCheckCache)
    .values({
      hostname: params.hostname,
      status: params.status,
      score: params.score,
      reasons: params.reasons,
      hitCount: params.hitCount,
      checkedAt: params.checkedAt,
      expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: domainCheckCache.hostname,
      set: {
        status: params.status,
        score: params.score,
        reasons: params.reasons,
        hitCount: params.hitCount,
        checkedAt: params.checkedAt,
        expiresAt,
        updatedAt: now,
      },
    });
}

export async function pruneExpiredCheckCache(): Promise<void> {
  const now = new Date().toISOString();
  await db
    .delete(urlCheckCache)
    .where(and(lt(urlCheckCache.expiresAt, now), lt(urlCheckCache.hitCount, 10)));
  await db
    .delete(domainCheckCache)
    .where(
      and(lt(domainCheckCache.expiresAt, now), lt(domainCheckCache.hitCount, 10)),
    );
}
