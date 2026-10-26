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
        badgeLabel: "HIGH RISK",
      };
    case "medium":
      return {
        title: "Be careful with this",
        tone: "warn",
        badgeLabel: "CAUTION",
      };
    case "low":
      return {
        title: "No clear scam signs found",
        tone: "safe",
        badgeLabel: "LOOKS OKAY",
      };
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

/** Short uppercase label for the classification pill. */
export function classificationLabel(primary: string): string {
  switch (primary) {
    case "credential_phishing":
      return "PHISHING";
    case "account_takeover":
      return "ACCOUNT TAKEOVER";
    case "tech_support":
      return "TECH SUPPORT";
    case "impersonation":
      return "IMPERSONATION";
    case "investment":
      return "INVESTMENT";
    case "romance":
      return "ROMANCE";
    case "job":
      return "JOB SCAM";
    case "invoice":
      return "INVOICE";
    case "payment":
      return "PAYMENT";
    case "crypto":
      return "CRYPTO";
    case "malware":
      return "MALWARE";
    case "other":
      return "OTHER";
    case "unknown":
      return "NONE";
    default:
      return primary.replaceAll("_", " ").toUpperCase();
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
