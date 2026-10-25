import { describe, expect, it, vi } from "vitest";
import {
  logModelCost,
  withAnalysisCostLogging,
} from "../services/cost-log.js";

describe("cost-log", () => {
  it("estimates normal and cached token costs with OpenAI pricing", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const cost = logModelCost("classifier", "gpt-6-luna", {
      inputTokens: 1000,
      outputTokens: 200,
      totalTokens: 1200,
      inputTokenDetails: {
        noCacheTokens: 700,
        cacheReadTokens: 300,
        cacheWriteTokens: 0,
      },
      outputTokenDetails: {
        textTokens: 200,
        reasoningTokens: 0,
      },
    });

    // 700 * 0.1 / 1e6 + 300 * 0.01 / 1e6 + 200 * 0.5 / 1e6
    expect(cost.inputCost).toBeCloseTo(0.00007, 8);
    expect(cost.cacheReadCost).toBeCloseTo(0.000003, 8);
    expect(cost.outputCost).toBeCloseTo(0.0001, 8);
    expect(cost.totalCost).toBeCloseTo(0.000173, 8);
    expect(cost.isLongContext).toBe(false);

    expect(info).toHaveBeenCalledWith(
      "[cost] classifier",
      expect.objectContaining({
        model: "gpt-6-luna",
        cost: expect.objectContaining({
          totalUsd: cost.totalCost,
        }),
      }),
    );

    info.mockRestore();
  });

  it("sums step costs for an analysis scope", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await withAnalysisCostLogging("analysis-1:initial", async () => {
      logModelCost("classifier", "gpt-6-luna", {
        inputTokens: 1000,
        outputTokens: 0,
        totalTokens: 1000,
      });
      logModelCost("reviewer", "gpt-6-luna", {
        inputTokens: 500,
        outputTokens: 100,
        totalTokens: 600,
        inputTokenDetails: {
          noCacheTokens: 200,
          cacheReadTokens: 300,
          cacheWriteTokens: 0,
        },
      });
    });

    expect(info).toHaveBeenCalledWith(
      "[cost] analysis total",
      expect.objectContaining({
        analysisId: "analysis-1:initial",
        cost: expect.objectContaining({
          totalUsd: expect.any(Number),
        }),
      }),
    );

    const totalCall = info.mock.calls.find(
      (call) => call[0] === "[cost] analysis total",
    );
    expect(totalCall?.[1].cost.totalUsd).toBeGreaterThan(0);

    info.mockRestore();
  });
});
