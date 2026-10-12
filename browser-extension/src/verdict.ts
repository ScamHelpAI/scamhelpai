import type { AnalysisResult, RiskLevel } from "./types.ts";

export type VerdictTone = "danger" | "warn" | "safe";

export type Verdict = {
  title: string;
  tone: VerdictTone;
  icon: string;
  recommendation: string;
  reasons: string[];
  riskScore: number;
  spoken: string;
};

function copyForLevel(level: RiskLevel): {
  title: string;
  tone: VerdictTone;
  icon: string;
} {
  switch (level) {
    case "critical":
    case "high":
      return { title: "This looks like a scam", tone: "danger", icon: "⛔" };
    case "medium":
      return { title: "Be careful with this", tone: "warn", icon: "⚠️" };
    case "low":
      return { title: "No clear scam signs found", tone: "safe", icon: "✅" };
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function toVerdict(result: AnalysisResult): Verdict {
  const copy = copyForLevel(result.risk.level);
  const reasons = result.evidence.map((item) => item.summary);
  const spokenParts = [copy.title + ".", result.summary];
  if (reasons.length > 0) {
    spokenParts.push("Warning signs: " + reasons.join(". "));
  }

  return {
    title: copy.title,
    tone: copy.tone,
    icon: copy.icon,
    recommendation: result.summary,
    reasons,
    riskScore: Math.round(result.risk.score * 100),
    spoken: spokenParts.join(" "),
  };
}
