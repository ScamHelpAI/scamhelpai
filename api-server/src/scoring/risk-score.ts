import type {
  AnalyzerFinding,
  AnalyzeResponse,
  RiskLevel,
  ScamCategory,
} from "../types/analyze.js";

function levelFromScore(score: number): RiskLevel {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function recommendationFor(level: RiskLevel, category: ScamCategory): string {
  switch (level) {
    case "high":
      if (category === "phishing") {
        return "Do not enter your login information.";
      }
      return "Do not interact with this content. Close it and verify through an official channel.";
    case "medium":
      return "Be cautious. Verify the sender or website through an official app or bookmark before taking action.";
    case "low":
      return "No strong scam signals were found, but stay alert with unexpected requests.";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

function pickCategory(findings: AnalyzerFinding[]): ScamCategory {
  const counts = new Map<ScamCategory, number>();
  for (const f of findings) {
    if (!f.category || f.category === "unknown") continue;
    counts.set(f.category, (counts.get(f.category) ?? 0) + f.weight);
  }

  let best: ScamCategory = "unknown";
  let bestWeight = 0;
  for (const [category, weight] of counts) {
    if (weight > bestWeight) {
      best = category;
      bestWeight = weight;
    }
  }

  if (bestWeight === 0) return "legitimate";
  return best;
}

export function scoreRisk(findings: AnalyzerFinding[]): AnalyzeResponse {
  const weighted = findings.filter((f) => f.weight > 0);
  const riskScore = Math.min(
    100,
    weighted.reduce((sum, f) => sum + f.weight, 0),
  );
  const level = levelFromScore(riskScore);
  const category =
    riskScore === 0 ? "legitimate" : pickCategory(findings);
  const reasons = [...new Set(findings.map((f) => f.reason))].slice(0, 8);

  return {
    riskScore,
    level,
    category,
    reasons:
      reasons.length > 0
        ? reasons
        : ["No strong scam indicators were detected."],
    recommendation: recommendationFor(level, category),
  };
}
