import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { analyzeRequestSchema } from "../schemas/analysis-input.js";
import { runAnalysis } from "../services/analysis.server.js";
import {
  createPendingAnalysis,
  getAnalysisById,
  markAnalysisFailed,
  saveCompletedAnalysis,
} from "../services/analysis.repository.js";

const REVIEWER_MODEL = "gpt-6-luna";
const CLASSIFIER_MODEL = "gpt-6-luna";

export async function createAnalysisHandler(c: Context) {
  const body = analyzeRequestSchema.parse(await c.req.json());
  const id = crypto.randomUUID();

  const createdAt = await createPendingAnalysis(id, body);

  try {
    const { evidences, assessment, classifier, classifierModel, reviewerModel } =
      await runAnalysis(body, {
        reviewerModel: REVIEWER_MODEL,
        classifierModel: CLASSIFIER_MODEL,
      });
    const result = await saveCompletedAnalysis({
      id,
      createdAt,
      assessment,
      evidences,
      reviewerModel,
      classifier,
      classifierModel,
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
