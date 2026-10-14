import { eq } from "drizzle-orm";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import type { AnalysisResult } from "../schemas/analysis-result.js";
import type { Evidence } from "../schemas/evidence.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { ReviewerAssessment } from "../schemas/reviewer.js";
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

export async function saveCompletedAnalysis(params: {
  id: string;
  createdAt: string;
  assessment: ReviewerAssessment;
  evidences: Evidence[];
  reviewerModel: string;
  classifier?: ClassifierResult;
  classifierModel?: string;
}): Promise<AnalysisResult> {
  const completedAt = new Date().toISOString();
  const result = toAnalysisResult({
    id: params.id,
    assessment: params.assessment,
    evidences: params.evidences,
    createdAt: params.createdAt,
    completedAt,
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

    if (params.classifier) {
      await tx.insert(agentRuns).values({
        id: crypto.randomUUID(),
        analysisId: params.id,
        role: "analyst",
        model: params.classifierModel ?? "gpt-6-luna",
        resultJson: params.classifier,
        createdAt: completedAt,
      });
    }

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

export async function getAnalysisById(
  id: string,
): Promise<AnalysisResult | null> {
  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.id, id))
    .limit(1);

  if (!analysis || analysis.status !== "completed") {
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

  return {
    id: analysis.id,
    status: "completed",
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
    createdAt: analysis.createdAt,
    completedAt: analysis.completedAt ?? undefined,
  };
}
