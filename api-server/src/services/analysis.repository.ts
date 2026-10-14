import { and, eq } from "drizzle-orm";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import type {
  AnalysisResult,
  AnalysisReview,
} from "../schemas/analysis-result.js";
import type { Evidence } from "../schemas/evidence.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import {
  reviewerAssessmentSchema,
  type ReviewerAssessment,
} from "../schemas/reviewer.js";
import { db } from "../db/index.js";
import { agentRuns, analyses, analysisInputs, evidence } from "../db/schema.js";
import { toAnalysisResult } from "./analysis-mapper.js";

export async function createPendingAnalysis(
  id: string,
  request: AnalyzeRequest,
): Promise<string> {
  const createdAt = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx.insert(analyses).values({
      id,
      status: "analyzing",
      createdAt,
    });

    await tx.insert(analysisInputs).values(
      request.inputs.map((input, position) => ({
        id: crypto.randomUUID(),
        analysisId: id,
        position,
        input,
        createdAt,
      })),
    );
  });

  return createdAt;
}

export async function saveInitialAnalysis(params: {
  id: string;
  createdAt: string;
  assessment: ReviewerAssessment;
  evidences: Evidence[];
  classifier: ClassifierResult;
  classifierModel: string;
}): Promise<AnalysisResult> {
  const savedAt = new Date().toISOString();
  const result = toAnalysisResult({
    id: params.id,
    status: "reviewing",
    assessment: params.assessment,
    evidences: params.evidences,
    createdAt: params.createdAt,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(analyses)
      .set({
        status: "reviewing",
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        confidence: result.risk.confidence,
        scamType: result.classification.primary,
        summary: result.summary,
        completedAt: null,
      })
      .where(eq(analyses.id, params.id));

    if (params.evidences.length > 0) {
      await tx.insert(evidence).values(
        params.evidences.map((item) => ({
          id: item.id,
          analysisId: params.id,
          type: item.type,
          source: item.source,
          summary: item.summary,
          confidence: item.confidence,
          data: item.data ?? null,
          sourceInputId: item.sourceInputId ?? null,
          toolName: item.toolName ?? null,
          createdAt: item.createdAt,
        })),
      );
    }

    await tx.insert(agentRuns).values({
      id: crypto.randomUUID(),
      analysisId: params.id,
      role: "analyst",
      model: params.classifierModel,
      resultJson: params.classifier,
      createdAt: savedAt,
    });
  });

  return result;
}

export async function saveReviewCompletion(params: {
  id: string;
  createdAt: string;
  assessment: ReviewerAssessment;
  evidences: Evidence[];
  reviewerModel: string;
}): Promise<AnalysisResult> {
  const completedAt = new Date().toISOString();
  const review = toPublicReview(params.assessment);
  const result = toAnalysisResult({
    id: params.id,
    status: "completed",
    assessment: params.assessment,
    evidences: params.evidences,
    createdAt: params.createdAt,
    completedAt,
    review,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(analyses)
      .set({
        status: "completed",
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        confidence: result.risk.confidence,
        scamType: result.classification.primary,
        summary: result.summary,
        completedAt,
      })
      .where(eq(analyses.id, params.id));

    await tx.insert(agentRuns).values({
      id: crypto.randomUUID(),
      analysisId: params.id,
      role: "reviewer",
      model: params.reviewerModel,
      resultJson: params.assessment,
      createdAt: completedAt,
    });
  });

  return result;
}

export async function markAnalysisFailed(id: string): Promise<void> {
  await db
    .update(analyses)
    .set({
      status: "failed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(analyses.id, id));
}

export async function markAnalysisCompletedWithoutReview(
  id: string,
): Promise<void> {
  await db
    .update(analyses)
    .set({
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(analyses.id, id));
}

function toPublicReview(assessment: ReviewerAssessment): AnalysisReview {
  return {
    verdict: assessment.verdict,
    unsupportedClaims: assessment.unsupportedClaims,
    contradictions: assessment.contradictions,
    confidenceAdjustment: assessment.confidenceAdjustment,
  };
}

async function loadReview(analysisId: string): Promise<AnalysisReview | undefined> {
  const [row] = await db
    .select()
    .from(agentRuns)
    .where(
      and(eq(agentRuns.analysisId, analysisId), eq(agentRuns.role, "reviewer")),
    )
    .limit(1);

  if (!row) return undefined;

  const parsed = reviewerAssessmentSchema.safeParse(row.resultJson);
  if (!parsed.success) return undefined;
  return toPublicReview(parsed.data);
}

export async function getAnalysisById(
  id: string,
): Promise<AnalysisResult | null> {
  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.id, id))
    .limit(1);

  if (
    !analysis ||
    (analysis.status !== "completed" && analysis.status !== "reviewing")
  ) {
    return null;
  }

  const evidenceRows = await db
    .select()
    .from(evidence)
    .where(eq(evidence.analysisId, id));

  if (
    analysis.riskScore === null ||
    analysis.riskLevel === null ||
    analysis.confidence === null ||
    analysis.scamType === null ||
    !analysis.summary
  ) {
    return null;
  }

  const review =
    analysis.status === "completed" ? await loadReview(id) : undefined;

  return {
    id: analysis.id,
    status: analysis.status,
    risk: {
      score: analysis.riskScore,
      level: analysis.riskLevel,
      confidence: analysis.confidence,
    },
    classification: {
      primary: analysis.scamType,
    },
    summary: analysis.summary,
    evidence: evidenceRows.map((item) => ({
      id: item.id,
      summary: item.summary,
      severity:
        item.confidence >= 0.7
          ? "high"
          : item.confidence >= 0.4
            ? "medium"
            : "low",
    })),
    ...(review ? { review } : {}),
    createdAt: analysis.createdAt,
    completedAt: analysis.completedAt ?? undefined,
  };
}
