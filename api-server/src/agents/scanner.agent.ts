import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent } from "ai";

export function createScannerAgent() {
  return new ToolLoopAgent({
    id: "scanner",
    model: openai("gpt-5.6-luna"),
    instructions:
      "You scan content for potential scams, fraud signals, and suspicious patterns.",
    tools: {},
  });
}
