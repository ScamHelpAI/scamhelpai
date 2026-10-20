import type { CheckUrlResult } from "./check.ts";
import type {
  AnalysisDecision,
  AnalysisResult,
  AnalyzeRequest,
  RiskyPart,
} from "./types.ts";

export type ReadPageMessage = {
  type: "readPageContents";
};

export type ReadPageResponse =
  | { ok: true; url: string; title: string; html: string }
  | { ok: false; error: string };

export type AnalyzeMessage = {
  type: "analyze";
  request: AnalyzeRequest;
};

export type AnalyzeResponse =
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: string };

export type GetAnalysisMessage = {
  type: "getAnalysis";
  id: string;
};

export type ReadActivePageMessage = {
  type: "readActivePage";
};

export type ScanActivePageMessage = {
  type: "scanActivePage";
};

export type CheckUrlsMessage = {
  type: "checkUrls";
  urls: string[];
};

export type CheckUrlsResponseMessage =
  | { ok: true; results: CheckUrlResult[] }
  | { ok: false; error: string };

export type ApplyPageAnnotationsMessage = {
  type: "applyPageAnnotations";
  decision: AnalysisDecision;
  riskyParts: RiskyPart[];
};

export type ApplyPageAnnotationsResponse =
  | { ok: true }
  | { ok: false; error: string };

export type ExtensionRequest =
  | ReadPageMessage
  | AnalyzeMessage
  | GetAnalysisMessage
  | ReadActivePageMessage
  | ScanActivePageMessage
  | CheckUrlsMessage
  | ApplyPageAnnotationsMessage;
