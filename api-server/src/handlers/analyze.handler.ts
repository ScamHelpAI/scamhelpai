import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import { analyzeRequestSchema } from "../schemas/analysis-input.js";
import type { ScamType } from "../schemas/analyst.js";
import type { RiskLevel } from "../schemas/analysis-result.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";
import {
  runInitialAnalysis,
  runVerifierReview,
  type OpenAILanguageModelId,
} from "../services/analyze/analysis.server.js";
import {
  createPendingAnalysis,
  getAnalysisById,
  getAnalysisCompletionSnapshot,
  markAnalysisCompletedWithoutReview,
  markAnalysisFailed,
  saveInitialAnalysis,
  saveReviewCompletion,
} from "../services/analyze/analysis.repository.js";
import {
  recordAnalysisCompletionStats,
  recordAnalysisFailureStats,
} from "../services/analyze/analysis-stats.js";
import { purgeAnalysisAssetsIfEligible } from "../services/analyze/asset-purge.js";
import {
  assertAnalysisAssetsReady,
  listAnalysisAssetIds,
} from "../services/analyze/asset-validate.js";
import { withAnalysisCostLogging } from "../services/cost-log.js";

async function maybePurgeLowRiskAssets(
  analysisId: string,
  riskLevel: RiskLevel | null,
): Promise<void> {
  if (!riskLevel) return;
  try {
    await purgeAnalysisAssetsIfEligible(analysisId, riskLevel);
  } catch (error) {
    console.error(`Asset purge failed for ${analysisId}:`, error);
  }
}

async function maybeRecordCompletionStats(params: {
  request: AnalyzeRequest;
  riskLevel: RiskLevel | null;
  scamType?: ScamType | null;
}): Promise<void> {
  if (!params.riskLevel) return;
  try {
    await recordAnalysisCompletionStats({
      riskLevel: params.riskLevel,
      scamType: params.scamType,
      source: params.request.context?.source,
      inputs: params.request.inputs,
    });
  } catch (error) {
    console.error("Failed to record analysis completion stats:", error);
  }
}

const REVIEWER_MODEL: OpenAILanguageModelId = "gpt-6-luna";
const CLASSIFIER_MODEL = "gpt-6-luna";

function startBackgroundReview(params: {
  id: string;
  createdAt: string;
  request: AnalyzeRequest;
  evidences: Evidence[];
  classifier: ClassifierResult;
  reviewerModel: OpenAILanguageModelId;
  extractedTextByInputIndex: Map<number, string>;
  allowedAssetIds: string[];
}): void {
  void (async () => {
    try {
      const assessment = await withAnalysisCostLogging(
        `${params.id}:review`,
        () =>
          runVerifierReview(
            params.request,
            params.evidences,
            params.classifier,
            params.reviewerModel,
            params.extractedTextByInputIndex,
            params.allowedAssetIds,
          ),
      );
      const completed = await saveReviewCompletion({
        id: params.id,
        createdAt: params.createdAt,
        assessment,
        evidences: params.evidences,
        reviewerModel: params.reviewerModel,
      });
      await maybeRecordCompletionStats({
        request: params.request,
        riskLevel: completed.risk.level,
        scamType: completed.classification.primary,
      });
      await maybePurgeLowRiskAssets(params.id, completed.risk.level);
    } catch (error) {
      console.error(`Background review failed for ${params.id}:`, error);
      // Keep the initial decision-model result available instead of failing the analysis.
      await markAnalysisCompletedWithoutReview(params.id);
      const snapshot = await getAnalysisCompletionSnapshot(params.id);
      await maybeRecordCompletionStats({
        request: params.request,
        riskLevel: snapshot?.riskLevel ?? null,
        scamType: snapshot?.scamType ?? null,
      });
      await maybePurgeLowRiskAssets(
        params.id,
        snapshot?.riskLevel ?? null,
      );
    }
  })();
}

export async function createAnalysisHandler(c: Context) {
  const body = analyzeRequestSchema.parse(await c.req.json());
  await assertAnalysisAssetsReady(body);

  const id = crypto.randomUUID();
  const createdAt = await createPendingAnalysis(id, body);

  try {
    const {
      evidences,
      extractedTextByInputIndex,
      assessment,
      classifier,
      classifierModel,
      reviewerModel,
    } = await withAnalysisCostLogging(`${id}:initial`, () =>
      runInitialAnalysis(body, {
        reviewerModel: REVIEWER_MODEL,
        classifierModel: CLASSIFIER_MODEL,
      }),
    );

    const result = await saveInitialAnalysis({
      id,
      createdAt,
      assessment,
      evidences,
      classifier,
      classifierModel,
    });

    startBackgroundReview({
      id,
      createdAt,
      request: body,
      evidences,
      classifier,
      reviewerModel,
      extractedTextByInputIndex,
      allowedAssetIds: listAnalysisAssetIds(body),
    });

    return c.json(result, 201);
  } catch (error) {
    await markAnalysisFailed(id);
    try {
      await recordAnalysisFailureStats({
        source: body.context?.source,
      });
    } catch (statsError) {
      console.error("Failed to record analysis failure stats:", statsError);
    }
    throw error;
  }
}

export async function getAnalysisHandler(c: Context) {
  const id = c.req.param("id");
  if (!id) {
    throw new HTTPException(400, { message: "Analysis id is required" });
  }

  const result = await getAnalysisById(id);

  if (!result) {
    throw new HTTPException(404, { message: "Analysis not found" });
  }

  return c.json(result);
}
