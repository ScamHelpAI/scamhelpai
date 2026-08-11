import { generateText, Output } from "ai";
import { z } from "zod";
import type { AnalyzerResult, AnalyzeRequest, ScamCategory } from "../types/analyze.js";

const llmSchema = z.object({
  suspicious: z.boolean(),
  category: z.enum([
    "phishing",
    "social_engineering",
    "malware",
    "legitimate",
    "unknown",
  ]),
  reasons: z.array(z.string()).max(4),
});

const MODEL = "openai/gpt-5.6-luna";

function buildPrompt(request: AnalyzeRequest): string {
  return `You are a scam-detection classifier. Score only whether the content looks like a scam or phishing. Be conservative: only mark suspicious when there is clear social-engineering or impersonation signal.

Input JSON:
${JSON.stringify(request, null, 2)}

Return structured output only.`;
}

export async function analyzeWithLlm(
  request: AnalyzeRequest,
): Promise<AnalyzerResult> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return { findings: [] };
  }

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: llmSchema }),
      prompt: buildPrompt(request),
      maxOutputTokens: 300,
    });

    if (!output?.suspicious) {
      return { findings: [] };
    }

    const category = output.category as ScamCategory;
    const reason =
      output.reasons[0] ??
      "An AI classifier flagged this content as suspicious.";

    return {
      findings: [
        {
          id: "llm-suspicious",
          weight: 15,
          reason,
          category,
        },
      ],
    };
  } catch {
    return { findings: [] };
  }
}
