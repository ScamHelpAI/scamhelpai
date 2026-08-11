export type AnalyzeInputType = "url" | "text" | "webpage";

export type RiskLevel = "low" | "medium" | "high";

export type ScamCategory =
  | "phishing"
  | "social_engineering"
  | "malware"
  | "legitimate"
  | "unknown";

export type FormInfo = {
  action?: string;
  inputs?: string[];
};

export type AnalyzeRequest =
  | {
      type: "url";
      url: string;
      text?: string;
    }
  | {
      type: "text";
      text: string;
      url?: string;
    }
  | {
      type: "webpage";
      url: string;
      text?: string;
      pageTitle?: string;
      forms?: FormInfo[];
    };

export type AnalyzerFinding = {
  id: string;
  weight: number;
  reason: string;
  category?: ScamCategory;
};

export type AnalyzerResult = {
  findings: AnalyzerFinding[];
};

export type AnalyzeResponse = {
  riskScore: number;
  level: RiskLevel;
  category: ScamCategory;
  reasons: string[];
  recommendation: string;
};
