export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AnalysisStatus =
  | "queued"
  | "analyzing"
  | "reviewing"
  | "completed"
  | "failed";

export type AnalysisDecision = {
  title: string;
  dont: string;
  do: string;
};

export type RiskyPart = {
  quote: string;
  message: string;
};

export type AnalysisResult = {
  id: string;
  status: AnalysisStatus;
  risk: {
    score: number;
    level: RiskLevel;
    confidence: number;
  };
  classification: {
    primary: string;
    secondary?: string[];
  };
  claimedIdentity?: string;
  summary: string;
  decision: AnalysisDecision;
  riskyParts: RiskyPart[];
  evidence: {
    id: string;
    summary: string;
    severity: "low" | "medium" | "high";
  }[];
  review?: {
    verdict:
      | "agree"
      | "agree_with_adjustments"
      | "disagree"
      | "insufficient_evidence";
    unsupportedClaims: string[];
    contradictions: string[];
    confidenceAdjustment: number;
  };
  createdAt: string;
  completedAt?: string;
};

export type AnalysisInput =
  | { type: "text"; content: string }
  | { type: "url"; url: string }
  | {
      type: "email";
      raw?: string;
      headers?: Record<string, string>;
      body?: string;
      assetIds?: string[];
    };

export type AnalyzeRequest = {
  inputs: AnalysisInput[];
  context?: {
    source: "browser_extension";
    pageUrl?: string;
  };
};
