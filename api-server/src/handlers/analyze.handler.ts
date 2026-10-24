import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import { analyzeRequestSchema } from "../schemas/analysis-input.js";
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
  markAnalysisCompletedWithoutReview,
  markAnalysisFailed,
  saveInitialAnalysis,
  saveReviewCompletion,
} from "../services/analyze/analysis.repository.js";

const REVIEWER_MODEL: OpenAILanguageModelId = "gpt-6-luna";
const CLASSIFIER_MODEL = "gpt-6-luna";

function startBackgroundReview(params: {
  id: string;
  createdAt: string;
  request: AnalyzeRequest;
  evidences: Evidence[];
  classifier: ClassifierResult;
  reviewerModel: OpenAILanguageModelId;
}): void {
  void (async () => {
    try {
      const assessment = await runVerifierReview(
        params.request,
        params.evidences,
        params.classifier,
        params.reviewerModel,
      );
      await saveReviewCompletion({
        id: params.id,
        createdAt: params.createdAt,
        assessment,
        evidences: params.evidences,
        reviewerModel: params.reviewerModel,
      });
    } catch (error) {
      console.error(`Background review failed for ${params.id}:`, error);
      // Keep the initial decision-model result available instead of failing the analysis.
      await markAnalysisCompletedWithoutReview(params.id);
    }
  })();
}

export async function createAnalysisHandler(c: Context) {
  const body = analyzeRequestSchema.parse(await c.req.json());
  const id = crypto.randomUUID();

  const createdAt = await createPendingAnalysis(id, body);

  try {
    const {
      evidences,
      assessment,
      classifier,
      classifierModel,
      reviewerModel,
    } = await runInitialAnalysis(body, {
      reviewerModel: REVIEWER_MODEL,
      classifierModel: CLASSIFIER_MODEL,
    });

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
    });

    return c.json(result, 201);
  } catch (error) {
    await markAnalysisFailed(id);
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
