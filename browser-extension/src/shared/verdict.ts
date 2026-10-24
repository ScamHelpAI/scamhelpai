import type { AnalysisResult, RiskLevel } from "./types.ts";

export type VerdictTone = "danger" | "warn" | "safe";

export type Verdict = {
  title: string;
  tone: VerdictTone;
  /** Short badge label for the UI (no numeric score). */
  badgeLabel: string;
  reasons: string[];
  status: AnalysisResult["status"];
};

/** Drop meta "we received input" noise — not useful to the user. */
function isUsefulReason(summary: string): boolean {
  return !/submission includes \w+ content \(\d+ characters?\)/i.test(summary);
}

function copyForLevel(level: RiskLevel): {
  title: string;
  tone: VerdictTone;
  badgeLabel: string;
} {
  switch (level) {
    case "critical":
    case "high":
      return {
        title: "This looks like a scam",
        tone: "danger",
        badgeLabel: "High risk",
      };
    case "medium":
      return {
        title: "Be careful with this",
        tone: "warn",
        badgeLabel: "Caution",
      };
    case "low":
      return {
        title: "No clear scam signs found",
        tone: "safe",
        badgeLabel: "Looks okay",
      };
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

  return {
    title: copy.title,
    tone: copy.tone,
    badgeLabel: copy.badgeLabel,
    reasons,
    status: result.status,
  };
}
