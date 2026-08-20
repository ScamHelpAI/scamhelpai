export type RiskLevel = "low" | "medium" | "high";

export type ScamCategory =
  | "phishing"
  | "social_engineering"
  | "malware"
  | "legitimate"
  | "unknown";

export type AnalyzeResponse = {
  riskScore: number;
  level: RiskLevel;
  category: ScamCategory;
  reasons: string[];
  recommendation: string;
};
