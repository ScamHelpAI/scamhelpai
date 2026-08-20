import {
  createReviewerAgent,
  type ReviewerOutput,
} from "../agents/reviewer.agent.js";
import {
  createScannerAgent,
  getScannerEvidences,
} from "../agents/scanner.agent.js";
import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../schemas/analysis-input.js";
import type { Evidence } from "../schemas/evidence.js";

const scanner = createScannerAgent();
const reviewer = createReviewerAgent();

export type RunAnalysisResult = {
  evidences: Evidence[];
  assessment: ReviewerOutput;
};

function formatInput(input: AnalysisInput, index: number): string {
  const label = `Input ${index + 1} (${input.type})`;

  switch (input.type) {
    case "text":
      return `${label}:\n${input.content}`;
    case "url":
      return `${label}:\n${input.url}`;
    case "image":
      return `${label}:\nassetId: ${input.assetId}`;
    case "audio":
      return `${label}:\nassetId: ${input.assetId}`;
    case "pdf":
      return `${label}:\nassetId: ${input.assetId}`;
    case "email": {
      const parts = [label];
      if (input.raw) parts.push(`raw:\n${input.raw}`);
      if (input.headers) {
        parts.push(`headers:\n${JSON.stringify(input.headers, null, 2)}`);
      }
      if (input.body) parts.push(`body:\n${input.body}`);
      if (input.assetIds?.length) {
        parts.push(`assetIds: ${input.assetIds.join(", ")}`);
      }
      return parts.join("\n");
    }
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

function buildScannerPrompt(request: AnalyzeRequest): string {
  const inputBlocks = request.inputs.map(formatInput).join("\n\n");
  const contextBlock = request.context
    ? `\n\nContext:\n${JSON.stringify(request.context, null, 2)}`
    : "";

  return `Analyze the following submission for scam indicators. Use tools to investigate URLs, domains, emails, and other indicators you find.\n\n${inputBlocks}${contextBlock}`;
}

function buildReviewerPrompt(evidences: Evidence[]): string {
  return `Review the scanner evidence below and produce your final structured assessment. Verify or challenge specific evidence with tools when needed.\n\nEvidence:\n${JSON.stringify(evidences, null, 2)}`;
}

export async function runAnalysis(
  request: AnalyzeRequest,
): Promise<RunAnalysisResult> {
  const scannerResult = await scanner.generate({
    prompt: buildScannerPrompt(request),
  });

  const evidences = getScannerEvidences(scannerResult.output);

  const reviewerResult = await reviewer.generate({
    prompt: buildReviewerPrompt(evidences),
  });

  return {
    evidences,
    assessment: reviewerResult.output,
  };
}
