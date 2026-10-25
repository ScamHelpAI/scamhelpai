/**
 * Orchestrates the analysis pipeline: collect evidence, run the decision model
 * for an initial assessment, and run the async verifier review.
 */
import { openai, type OpenAIDecisionModelId } from "@ai-sdk/openai";
import type { AnalyzeRequest } from "../../schemas/analysis-input.js";
import type { ClassifierResult } from "../../schemas/classifier.js";
import type { Evidence } from "../../schemas/evidence.js";
import type { ReviewerAssessment } from "../../schemas/reviewer.js";
import { collect } from "./collector.js";
import { DEFAULT_CLASSIFIER_MODEL, classifySubmission } from "./classifier.js";
import { assessmentFromClassifier } from "./classifier-gate.js";
import { runLlmReview } from "./reviewer.js";

export type OpenAILanguageModelId = Parameters<typeof openai>[0];

export type RunAnalysisOptions = {
  reviewerModel: OpenAILanguageModelId;
  classifierModel?: OpenAIDecisionModelId;
};

export type InitialAnalysisResult = {
  evidences: Evidence[];
  extractedTextByInputIndex: Map<number, string>;
  assessment: ReviewerAssessment;
  classifier: ClassifierResult;
  classifierModel: string;
  reviewerModel: OpenAILanguageModelId;
};

export async function runInitialAnalysis(
  request: AnalyzeRequest,
  options: RunAnalysisOptions,
): Promise<InitialAnalysisResult> {
  const { evidences, extractedTextByInputIndex } = await collect(request);
  const classifierModel = options.classifierModel ?? DEFAULT_CLASSIFIER_MODEL;
  const classifier = await classifySubmission(
    request,
    evidences,
    extractedTextByInputIndex,
    openai.decisionModel(classifierModel),
  );

  return {
    evidences,
    extractedTextByInputIndex,
    assessment: assessmentFromClassifier(classifier, evidences),
    classifier,
    classifierModel,
    reviewerModel: options.reviewerModel,
  };
}

export async function runVerifierReview(
  request: AnalyzeRequest,
  evidences: Evidence[],
  classifier: ClassifierResult,
  reviewerModel: OpenAILanguageModelId,
  extractedTextByInputIndex: Map<number, string> = new Map(),
  allowedAssetIds: string[] = [],
): Promise<ReviewerAssessment> {
  return runLlmReview(
    request,
    evidences,
    classifier,
    reviewerModel,
    extractedTextByInputIndex,
    allowedAssetIds,
  );
}
