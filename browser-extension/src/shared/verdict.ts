import type { AnalysisResult, RiskLevel } from "./types.ts";

export type VerdictTone = "danger" | "warn" | "safe";

export type Verdict = {
  title: string;
  tone: VerdictTone;
  reasons: string[];
  riskScore: number;
  status: AnalysisResult["status"];
  reviewNote?: string;
};

/** Drop meta "we received input" noise — not useful to the user. */
function isUsefulReason(summary: string): boolean {
  return !/submission includes \w+ content \(\d+ characters?\)/i.test(summary);
}

function copyForLevel(level: RiskLevel): {
  title: string;
  tone: VerdictTone;
} {
  switch (level) {
    case "critical":
    case "high":
      return { title: "This looks like a scam", tone: "danger" };
    case "medium":
      return { title: "Be careful with this", tone: "warn" };
    case "low":
      return { title: "No clear scam signs found", tone: "safe" };
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function toVerdict(result: AnalysisResult): Verdict {
  const copy = copyForLevel(result.risk.level);
  const reasons = result.evidence
    .map((item) => item.summary)
    .filter(isUsefulReason);
  const reviewNote =
    result.review && result.review.verdict !== "agree"
      ? `Reviewer: ${result.review.verdict.replaceAll("_", " ")}`
      : undefined;

  return {
    title: copy.title,
    tone: copy.tone,
    reasons,
    riskScore: Math.round(result.risk.score * 100),
    status: result.status,
    reviewNote,
  };
}
