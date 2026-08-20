import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent } from "ai";

export function createReviewerAgent() {
  return new ToolLoopAgent({
    id: "reviewer",
    model: openai("gpt-5.6-luna"),
    instructions:
      "You review scan findings and produce a clear, actionable risk assessment.",
    tools: {},
  });
}
