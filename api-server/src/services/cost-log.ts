/**
 * Estimated USD cost logging for analysis LLM calls via ai-sdk-cost-calculator
 * (accurate OpenAI pricing including cache read/write and long-context tiers).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import {
  type CostBreakdown,
  type CostAwareOptions,
  detectRequestsFromResult,
  formatCost,
  getCost,
} from "ai-sdk-cost-calculator";
import type { LanguageModelUsage } from "ai";

export type ModelUsageLike = Pick<
  LanguageModelUsage,
  "inputTokens" | "outputTokens" | "totalTokens"
> &
  Partial<Pick<LanguageModelUsage, "inputTokenDetails" | "outputTokenDetails">>;

export type LogModelCostOptions = CostAwareOptions & {
  /** Full generateText-style result for auto web-search detection. */
  result?: Parameters<typeof detectRequestsFromResult>[0];
};

type CostPart = { step: string; cost: CostBreakdown };

type AnalysisCostStore = {
  analysisId: string;
  parts: CostPart[];
};

const analysisCostStore = new AsyncLocalStorage<AnalysisCostStore>();

function toLanguageModelUsage(usage: ModelUsageLike): LanguageModelUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    inputTokenDetails: {
      noCacheTokens: usage.inputTokenDetails?.noCacheTokens,
      cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens,
      cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens,
    },
    outputTokenDetails: {
      textTokens: usage.outputTokenDetails?.textTokens,
      reasoningTokens: usage.outputTokenDetails?.reasoningTokens,
    },
  };
}

function tokenSummary(usage: LanguageModelUsage) {
  return {
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    total: usage.totalTokens ?? 0,
    noCache: usage.inputTokenDetails.noCacheTokens ?? 0,
    cacheRead: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWrite: usage.inputTokenDetails.cacheWriteTokens ?? 0,
    reasoning: usage.outputTokenDetails.reasoningTokens ?? 0,
  };
}

function costSummary(cost: CostBreakdown) {
  return {
    input: formatCost(cost.inputCost),
    output: formatCost(cost.outputCost),
    cacheRead: formatCost(cost.cacheReadCost),
    cacheWrite: formatCost(cost.cacheWriteCost),
    reasoning: formatCost(cost.reasoningCost),
    webSearch: formatCost(cost.webSearchCost),
    total: formatCost(cost.totalCost),
    totalUsd: cost.totalCost,
    isLongContext: cost.isLongContext,
  };
}

function logAnalysisCostTotal(store: AnalysisCostStore): void {
  const { analysisId, parts } = store;
  if (parts.length === 0) return;

  const total = parts.reduce((sum, part) => sum + part.cost.totalCost, 0);
  const cacheRead = parts.reduce(
    (sum, part) => sum + part.cost.cacheReadCost,
    0,
  );
  const cacheWrite = parts.reduce(
    (sum, part) => sum + part.cost.cacheWriteCost,
    0,
  );
  const input = parts.reduce((sum, part) => sum + part.cost.inputCost, 0);
  const output = parts.reduce((sum, part) => sum + part.cost.outputCost, 0);
  const webSearch = parts.reduce(
    (sum, part) => sum + part.cost.webSearchCost,
    0,
  );

  console.info(`[cost] analysis total`, {
    analysisId,
    steps: parts.map((part) => ({
      step: part.step,
      total: formatCost(part.cost.totalCost),
    })),
    cost: {
      input: formatCost(input),
      output: formatCost(output),
      cacheRead: formatCost(cacheRead),
      cacheWrite: formatCost(cacheWrite),
      webSearch: formatCost(webSearch),
      total: formatCost(total),
      totalUsd: total,
    },
  });
}

/**
 * Run `fn` in an analysis cost scope. Each `logModelCost` call is attributed to
 * `analysisId`, and a summed total is logged when `fn` settles.
 */
export async function withAnalysisCostLogging<T>(
  analysisId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const store: AnalysisCostStore = { analysisId, parts: [] };
  return analysisCostStore.run(store, async () => {
    try {
      return await fn();
    } finally {
      logAnalysisCostTotal(store);
    }
  });
}

/**
 * Estimate and log cost for a single model call (normal + cached pricing).
 */
export function logModelCost(
  step: string,
  model: string,
  usage: ModelUsageLike,
  options: LogModelCostOptions = {},
): CostBreakdown {
  const { result, ...costOptions } = options;
  const normalized = toLanguageModelUsage(usage);
  const store = analysisCostStore.getStore();

  const detected = result
    ? detectRequestsFromResult(result, { model })
    : undefined;

  const cost = getCost(model, normalized, {
    ...costOptions,
    webSearchRequests:
      costOptions.webSearchRequests ?? detected?.webSearchRequests,
  });

  store?.parts.push({ step, cost });

  console.info(`[cost] ${step}`, {
    analysisId: store?.analysisId,
    model,
    tokens: tokenSummary(normalized),
    cost: costSummary(cost),
  });

  return cost;
}
