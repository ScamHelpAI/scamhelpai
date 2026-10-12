import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "./types.ts";
import { toVerdict } from "./verdict.ts";

function result(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: "an-1",
    status: "completed",
    risk: { score: 0.73, level: "high", confidence: 0.8 },
    classification: { primary: "credential_phishing" },
    summary: "Do not enter your login information.",
    evidence: [
      { id: "ev-1", summary: "Sender domain is not PayPal.", severity: "high" },
      { id: "ev-2", summary: "The link uses a lookalike host.", severity: "high" },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toVerdict", () => {
  it("maps high and critical risk to the scam copy", () => {
    expect(toVerdict(result()).title).toBe("This looks like a scam");
    expect(toVerdict(result()).tone).toBe("danger");
    expect(
      toVerdict(result({ risk: { score: 0.9, level: "critical", confidence: 0.9 } }))
        .tone,
    ).toBe("danger");
  });

  it("maps medium risk to a caution title", () => {
    const verdict = toVerdict(
      result({ risk: { score: 0.4, level: "medium", confidence: 0.5 } }),
    );
    expect(verdict.title).toBe("Be careful with this");
    expect(verdict.tone).toBe("warn");
  });

  it("maps low risk to the all-clear copy", () => {
    const verdict = toVerdict(
      result({ risk: { score: 0.1, level: "low", confidence: 0.6 } }),
    );
    expect(verdict.title).toBe("No clear scam signs found");
    expect(verdict.tone).toBe("safe");
  });

  it("uses the API summary and evidence as the spoken recommendation", () => {
    const verdict = toVerdict(result());
    expect(verdict.recommendation).toBe("Do not enter your login information.");
    expect(verdict.reasons).toEqual([
      "Sender domain is not PayPal.",
      "The link uses a lookalike host.",
    ]);
    expect(verdict.riskScore).toBe(73);
    expect(verdict.spoken).toContain("This looks like a scam");
    expect(verdict.spoken).toContain("Do not enter your login information.");
    expect(verdict.spoken).toContain("Sender domain is not PayPal.");
  });
});
