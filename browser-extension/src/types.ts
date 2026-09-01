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
  createdAt: string;
  completedAt?: string;
};

export type AnalyzeRequest = {
  inputs: Array<{ type: "url"; url: string }>;
  context?: {
    source: "browser_extension";
    pageUrl?: string;
  };
};
