import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/index.js", () => ({
  db: {
    insert: vi.fn(),
  },
}));

import { db } from "../db/index.js";
import {
  buildCompletionStatKeys,
  incrementAnalysisStatCounters,
  recordAnalysisCompletionStats,
  recordAnalysisFailureStats,
} from "../services/analyze/analysis-stats.js";

describe("buildCompletionStatKeys", () => {
  it("includes completed, risk, source, scam type, and input types", () => {
    const keys = buildCompletionStatKeys({
      riskLevel: "low",
      scamType: "unknown",
      source: "web_app",
      inputs: [
        { type: "text", content: "hi" },
        { type: "url", url: "https://example.com" },
      ],
    });

    expect(keys).toEqual(
      expect.arrayContaining([
        "completed",
        "risk:low",
        "scam_type:unknown",
        "source:web_app",
        "input:text",
        "input:url",
      ]),
    );
  });

  it("uses unknown source when missing", () => {
    const keys = buildCompletionStatKeys({
      riskLevel: "high",
      inputs: [{ type: "image", assetId: "a1" }],
    });
    expect(keys).toContain("source:unknown");
    expect(keys).toContain("input:image");
  });
});

describe("incrementAnalysisStatCounters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts each counter key", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    vi.mocked(db.insert).mockReturnValue({ values } as never);

    await incrementAnalysisStatCounters(["completed", "risk:low"]);

    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(2);
  });
});

describe("recordAnalysisCompletionStats / failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    vi.mocked(db.insert).mockReturnValue({ values } as never);
  });

  it("records completion counters", async () => {
    await recordAnalysisCompletionStats({
      riskLevel: "medium",
      scamType: "impersonation",
      source: "browser_extension",
      inputs: [{ type: "pdf", assetId: "p1" }],
    });
    expect(db.insert).toHaveBeenCalled();
  });

  it("records failure counters", async () => {
    await recordAnalysisFailureStats({ source: "api" });
    expect(db.insert).toHaveBeenCalled();
  });
});
