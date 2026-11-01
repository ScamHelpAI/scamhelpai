import type { AnalysisResult, RiskLevel } from "@/lib/analysis-types";

export type VerdictTone = "danger" | "warn" | "safe";

export type VerdictAction = { kind: "dont" | "do"; text: string };

export type Verdict = {
  title: string;
  tone: VerdictTone;
  badgeLabel: string;
  /** Don't lines first, then Do lines: the reviewer's decision plus level guidance. */
  nextSteps: VerdictAction[];
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
  nextSteps: VerdictAction[];
} {
  switch (level) {
    case "critical":
    case "high":
      return {
        title: "This looks like a scam",
        tone: "danger",
        badgeLabel: "HIGH RISK",
        nextSteps: [
          {
            kind: "dont",
            text: "Don't click links, reply, call back, or send money or gift cards.",
          },
          { kind: "do", text: "Block the sender and delete the message." },
          {
            kind: "do",
            text: "Already shared info or paid? Call your bank now and change your passwords.",
          },
        ],
      };
    case "medium":
      return {
        title: "Be careful with this",
        tone: "warn",
        badgeLabel: "CAUTION",
        nextSteps: [
          { kind: "dont", text: "Don't click links or pay anything yet." },
          {
            kind: "do",
            text: "Contact the company or person yourself, using a number or website you already trust.",
          },
          {
            kind: "do",
            text: "If you're unsure, ask someone you trust before you act.",
          },
        ],
      };
    case "low":
      return {
        title: "No clear scam signs found",
        tone: "safe",
        badgeLabel: "LOOKS OKAY",
        nextSteps: [
          { kind: "do", text: "You can likely continue, but stay alert." },
          {
            kind: "dont",
            text: "Never share passwords or one-time codes, even if asked.",
          },
        ],
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
  // Reviewer-written risky-part notes are plain language; raw evidence summaries are the fallback.
  const reasons = result.riskyParts?.length
    ? result.riskyParts.map((part) => part.message)
    : result.evidence.map((item) => item.summary).filter(isUsefulReason);
  const decision: VerdictAction[] = result.decision
    ? [
        { kind: "dont", text: result.decision.dont },
        { kind: "do", text: result.decision.do },
      ]
    : [];
  const nextSteps = [...decision, ...copy.nextSteps].sort(
    (a, b) => Number(a.kind === "do") - Number(b.kind === "do"),
  );

  return {
    title: copy.title,
    tone: copy.tone,
    badgeLabel: copy.badgeLabel,
    nextSteps,
    reasons,
    status: result.status,
  };
}
