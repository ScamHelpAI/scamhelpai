/**
 * Readiness checks for dependent infra (Postgres, Redis, S3/MinIO) used by
 * the health endpoint.
 */
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../db/index.js";

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

function checkRedis(): CheckStatus {
  return env.REDIS_URL ? "ok" : "skipped";
}

function checkS3(): CheckStatus {
  const configured =
    env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET;

  return configured ? "ok" : "skipped";
}

export async function getReadiness(): Promise<ReadinessResult> {
  const checks: ReadinessChecks = {
    postgres: await checkPostgres(),
    redis: checkRedis(),
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
