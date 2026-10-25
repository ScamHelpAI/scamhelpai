import type { AnalysisResult, RiskLevel } from "@/lib/analysis-types";

export type VerdictTone = "danger" | "warn" | "safe";

export type Verdict = {
  title: string;
  tone: VerdictTone;
  badgeLabel: string;
  reasons: string[];
  status: AnalysisResult["status"];
};

function isUsefulReason(summary: string): boolean {
  if (/submission includes \w+ content \(\d+ characters?\)/i.test(summary)) {
    return false;
  }
  if (/^File .+ \([^)]+, \d+ bytes\); malware scan:/i.test(summary)) {
    return false;
  }
  return true;
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

export function toneTextClass(tone: VerdictTone): string {
  switch (tone) {
    case "danger":
      return "text-risk-high";
    case "warn":
      return "text-risk-medium";
    case "safe":
      return "text-risk-low";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}
