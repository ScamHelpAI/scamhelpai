export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AnalysisStatus =
  | "queued"
  | "analyzing"
  | "reviewing"
  | "completed"
  | "failed";

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
  | { type: "image"; assetId: string }
  | { type: "pdf"; assetId: string }
  | { type: "audio"; assetId: string };

export type AnalyzeRequest = {
  inputs: AnalysisInput[];
  context?: {
    source: "web_app";
    pageUrl?: string;
    referrer?: string;
    locale?: string;
  };
};

export type PresignAssetResponse = {
  assetId: string;
  uploadUrl: string;
  expiresIn: number;
  requiredHeaders?: Record<string, string>;
};
