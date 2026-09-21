import { gateway, type GatewayModelId } from "ai";
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

export type RunAnalysisOptions = {
  reviewerModel: GatewayModelId;
  classifierModel?: string;
};

export type RunAnalysisResult = {
  evidences: Evidence[];
  assessment: ReviewerAssessment;
  classifier: ClassifierResult;
  classifierModel: string;
  reviewerModel: GatewayModelId;
  usedLlmReviewer: boolean;
};

export async function runAnalysis(
  request: AnalyzeRequest,
  options: RunAnalysisOptions,
): Promise<RunAnalysisResult> {
  const evidences = await collect(request);
  const classifier = await classifySubmission(
    request,
    evidences,
    gateway.evaluationModel(
      (options.classifierModel ?? DEFAULT_CLASSIFIER_MODEL) as GatewayModelId,
    ),
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
    classifierModel: options.classifierModel ?? DEFAULT_CLASSIFIER_MODEL,
    reviewerModel: options.reviewerModel,
    usedLlmReviewer: needsReview,
  };
}
