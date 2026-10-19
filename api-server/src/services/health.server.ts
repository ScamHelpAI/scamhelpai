/**
 * Readiness checks for dependent infra (Postgres, Redis, S3/MinIO) used by
 * the health endpoint.
 */
import { sql } from "drizzle-orm";
import { pingRedis } from "../cache/redis.js";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { isS3Configured } from "../storage/s3.js";

type CheckStatus = "ok" | "error" | "skipped";

export type ReadinessChecks = {
  postgres: CheckStatus;
  redis: CheckStatus;
  s3: CheckStatus;
};

export type ReadinessResult = {
  status: "ready" | "degraded" | "not_ready";
  checks: ReadinessChecks;
};

async function checkPostgres(): Promise<CheckStatus> {
  try {
    await db.execute(sql`SELECT 1`);
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<CheckStatus> {
  if (!env.REDIS_URL) return "skipped";
  return (await pingRedis()) ? "ok" : "error";
}

function checkS3(): CheckStatus {
  return isS3Configured() ? "ok" : "skipped";
}

export async function getReadiness(): Promise<ReadinessResult> {
  const checks: ReadinessChecks = {
    postgres: await checkPostgres(),
    redis: await checkRedis(),
    s3: checkS3(),
  };

  if (checks.postgres === "error") {
    return { status: "not_ready", checks };
  }

  const hasDegradedOptional =
    (env.REDIS_URL && checks.redis === "error") ||
    (env.S3_ENDPOINT && checks.s3 === "error");

  return {
    status: hasDegradedOptional ? "degraded" : "ready",
    checks,
  };
}
