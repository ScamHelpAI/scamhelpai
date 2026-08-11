import { analyzeUrl } from "../analyzers/url.js";
import { analyzeText } from "../analyzers/text.js";
import { analyzeWebpage } from "../analyzers/webpage.js";
import { analyzeWithLlm } from "../analyzers/llm.js";
import { scoreRisk } from "../scoring/risk-score.js";
import type {
  AnalyzerFinding,
  AnalyzeRequest,
  AnalyzeResponse,
} from "../types/analyze.js";

export async function runAnalysis(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const findings: AnalyzerFinding[] = [];

  switch (request.type) {
    case "url": {
      findings.push(
        ...analyzeUrl(request.url, request.text).findings,
      );
      if (request.text) {
        findings.push(...analyzeText(request.text).findings);
      }
      break;
    }
    case "text": {
      findings.push(...analyzeText(request.text).findings);
      if (request.url) {
        findings.push(
          ...analyzeUrl(request.url, request.text).findings,
        );
      }
      break;
    }
    case "webpage": {
      findings.push(
        ...analyzeUrl(
          request.url,
          `${request.pageTitle ?? ""}\n${request.text ?? ""}`,
        ).findings,
      );
      if (request.text) {
        findings.push(...analyzeText(request.text).findings);
      }
      findings.push(...analyzeWebpage(request).findings);
      break;
    }
    default: {
      const _exhaustive: never = request;
      return _exhaustive;
    }
  }

  const llm = await analyzeWithLlm(request);
  findings.push(...llm.findings);

  return scoreRisk(findings);
}
