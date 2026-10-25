/**
 * Durable aggregate counters for completed/failed analyses. Incremented on
 * completion before low/medium content purge so metrics survive deletion.
 */
import { sql } from "drizzle-orm";
import type {
  AnalysisInput,
  AnalysisSource,
} from "../../schemas/analysis-input.js";
import type { RiskLevel } from "../../schemas/analysis-result.js";
import type { ScamType } from "../../schemas/analyst.js";
import { db } from "../../db/index.js";
import { analysisStatCounters } from "../../db/schema.js";

export function buildCompletionStatKeys(params: {
  riskLevel: RiskLevel;
  scamType?: ScamType | null;
  source?: AnalysisSource | null;
  inputs: AnalysisInput[];
}): string[] {
  const keys = new Set<string>([
    "completed",
    `risk:${params.riskLevel}`,
  ]);

  if (params.scamType) {
    keys.add(`scam_type:${params.scamType}`);
  }

  keys.add(`source:${params.source ?? "unknown"}`);

  const inputTypes = new Set(params.inputs.map((input) => input.type));
  for (const type of inputTypes) {
    keys.add(`input:${type}`);
  }

  return [...keys];
}

export async function incrementAnalysisStatCounters(
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;

  const updatedAt = new Date().toISOString();

  for (const key of keys) {
    await db
      .insert(analysisStatCounters)
      .values({ key, value: 1, updatedAt })
      .onConflictDoUpdate({
        target: analysisStatCounters.key,
        set: {
          value: sql`${analysisStatCounters.value} + 1`,
          updatedAt,
        },
      });
  }
}

export async function recordAnalysisCompletionStats(params: {
  riskLevel: RiskLevel;
  scamType?: ScamType | null;
  source?: AnalysisSource | null;
  inputs: AnalysisInput[];
}): Promise<void> {
  await incrementAnalysisStatCounters(buildCompletionStatKeys(params));
}

export async function recordAnalysisFailureStats(params?: {
  source?: AnalysisSource | null;
}): Promise<void> {
  const keys = ["failed", `source:${params?.source ?? "unknown"}`];
  await incrementAnalysisStatCounters(keys);
}

export async function listAnalysisStatCounters(): Promise<
  Array<{ key: string; value: number; updatedAt: string }>
> {
  const rows = await db.select().from(analysisStatCounters);
  return rows.map((row) => ({
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt,
  }));
}
