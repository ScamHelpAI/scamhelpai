/**
 * After low/medium-risk analyses complete, hard-delete stored submission
 * inputs, evidence rows, and uploaded files. High and critical keep data
 * for follow-up. Analysis result rows (score, summary, decision) stay.
 */
import { eq } from "drizzle-orm";
import type { RiskLevel } from "../../schemas/analysis-result.js";
import { reviewerAssessmentSchema } from "../../schemas/reviewer.js";
import { db } from "../../db/index.js";
import { agentRuns, analysisInputs, evidence } from "../../db/schema.js";
import {
  deleteAssetById,
  listAssetsForAnalysis,
} from "../asset.repository.js";
import { deleteObject, isS3Configured } from "../../storage/s3.js";

export function shouldPurgeAssetsForRisk(level: RiskLevel): boolean {
  return level === "low" || level === "medium";
}

async function deleteStoredAnalysisInputs(analysisId: string): Promise<number> {
  const deleted = await db
    .delete(analysisInputs)
    .where(eq(analysisInputs.analysisId, analysisId))
    .returning({ id: analysisInputs.id });
  return deleted.length;
}

async function deleteStoredEvidence(analysisId: string): Promise<number> {
  const deleted = await db
    .delete(evidence)
    .where(eq(evidence.analysisId, analysisId))
    .returning({ id: evidence.id });
  return deleted.length;
}

/** Drop quoted submission snippets; keep the assessment row for the verdict. */
async function clearStoredRiskyQuotes(analysisId: string): Promise<number> {
  const rows = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.analysisId, analysisId));

  let updated = 0;
  for (const row of rows) {
    const parsed = reviewerAssessmentSchema.safeParse(row.resultJson);
    if (!parsed.success) continue;
    if (parsed.data.riskyParts.length === 0) continue;

    await db
      .update(agentRuns)
      .set({
        resultJson: {
          ...parsed.data,
          riskyParts: [],
        },
      })
      .where(eq(agentRuns.id, row.id));
    updated += 1;
  }

  return updated;
}

async function purgeLinkedAssets(
  analysisId: string,
): Promise<{ purgedAssetIds: string[] }> {
  const linked = await listAssetsForAnalysis(analysisId);
  const purgedAssetIds: string[] = [];

  for (const asset of linked) {
    if (isS3Configured()) {
      try {
        await deleteObject(asset.objectKey);
      } catch (error) {
        console.error(
          `Failed to delete S3 object ${asset.objectKey} for analysis ${analysisId}:`,
          error,
        );
        // Keep the DB row so a later retry can find the object key.
        continue;
      }
    }

    const removed = await deleteAssetById(asset.id);
    if (removed) {
      purgedAssetIds.push(asset.id);
    }
  }

  return { purgedAssetIds };
}

export async function purgeAnalysisAssetsIfEligible(
  analysisId: string,
  riskLevel: RiskLevel,
): Promise<{
  purgedAssetIds: string[];
  deletedInputs: number;
  deletedEvidence: number;
  clearedAssessments: number;
}> {
  if (!shouldPurgeAssetsForRisk(riskLevel)) {
    return {
      purgedAssetIds: [],
      deletedInputs: 0,
      deletedEvidence: 0,
      clearedAssessments: 0,
    };
  }

  const deletedInputs = await deleteStoredAnalysisInputs(analysisId);
  const deletedEvidence = await deleteStoredEvidence(analysisId);
  const clearedAssessments = await clearStoredRiskyQuotes(analysisId);
  const { purgedAssetIds } = await purgeLinkedAssets(analysisId);

  return {
    purgedAssetIds,
    deletedInputs,
    deletedEvidence,
    clearedAssessments,
  };
}
