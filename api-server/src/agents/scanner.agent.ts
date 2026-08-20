import { openai } from "@ai-sdk/openai";
import { Output, ToolLoopAgent } from "ai";
import {
  normalizeScannerOutput,
  scannerOutputSchema,
  type ScannerOutput,
} from "../schemas/scanner.js";
import { createScannerTools } from "../tools/index.js";

const SCANNER_INSTRUCTIONS = `You scan content for potential scams, fraud signals, and suspicious patterns.

Use the available tools to gather factual evidence before producing your final structured output.

When you finish investigating, return every distinct piece of evidence you found in the evidences array.
Each evidence item must follow the evidence schema:
- id: stable identifier such as ev-001, ev-002
- type: visual | text | url | domain | email | threat_intel | identity | file | external | model_inference
- source: user_input (from submitted content), tool (from a tool result), or model_inference (your own observation without a tool)
- summary: one factual sentence describing what was observed
- confidence: number from 0 to 1
- data: optional structured payload (for example a tool result excerpt)
- toolName: include when source is tool
- sourceInputId: include when tied to a specific submitted input
- createdAt: ISO-8601 timestamp

Collect evidence only. Do not render a final scam verdict, risk score, or recommended actions.`;

export function createScannerAgent() {
  return new ToolLoopAgent({
    id: "scanner",
    model: openai("gpt-5.6-luna"),
    instructions: SCANNER_INSTRUCTIONS,
    tools: createScannerTools(),
    output: Output.object({
      schema: scannerOutputSchema,
      description:
        "All factual evidence gathered from user inputs and tool results.",
    }),
  });
}

export type ScannerAgent = ReturnType<typeof createScannerAgent>;

/** Parsed structured output with ids and timestamps normalized. */
export function getScannerEvidences(
  output: ScannerOutput,
  generatedAt?: string,
) {
  return normalizeScannerOutput(output, generatedAt).evidences;
}
