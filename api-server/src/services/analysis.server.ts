import { openai, type OpenAIDecisionModelId } from "@ai-sdk/openai";
import type { AnalyzeRequest } from "../schemas/analysis-input.js";
import type { ClassifierResult } from "../schemas/classifier.js";
import type { Evidence } from "../schemas/evidence.js";
import type { ReviewerAssessment } from "../schemas/reviewer.js";
import { collect } from "./collector.js";
import {
  DEFAULT_CLASSIFIER_MODEL,
  classifySubmission,
} from "./classifier.js";
import {
  assessmentFromClassifier,
  shouldReview,
} from "./classifier-gate.js";
import { runLlmReview } from "./reviewer.js";

type OpenAILanguageModelId = Parameters<typeof openai>[0];

export type RunAnalysisOptions = {
  reviewerModel: OpenAILanguageModelId;
  classifierModel?: OpenAIDecisionModelId;
};

export type RunAnalysisResult = {
  evidences: Evidence[];
  assessment: ReviewerAssessment;
  classifier: ClassifierResult;
  classifierModel: string;
  reviewerModel: OpenAILanguageModelId;
  usedLlmReviewer: boolean;
};

export async function runAnalysis(
  request: AnalyzeRequest,
  options: RunAnalysisOptions,
): Promise<RunAnalysisResult> {
  const evidences = await collect(request);
  const classifierModel = options.classifierModel ?? DEFAULT_CLASSIFIER_MODEL;
  const classifier = await classifySubmission(
    request,
    evidences,
    openai.decisionModel(classifierModel),
  );

  const needsReview = shouldReview(request, classifier, evidences);
  const assessment = needsReview
    ? await runLlmReview(
        request,
        evidences,
        classifier,
        options.reviewerModel,
      )
    : assessmentFromClassifier(classifier, evidences);

  return {
    evidences,
    assessment,
    classifier,
    classifierModel,
    reviewerModel: options.reviewerModel,
    usedLlmReviewer: needsReview,
  };
}
