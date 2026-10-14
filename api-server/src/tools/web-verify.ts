import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

type SearchSnippet = {
  title: string;
  url: string;
  snippet: string;
};

const WEB_VERIFY_MODEL = "gpt-6-luna" as const;

export const webSearchTool = openai.tools.webSearch({
  searchContextSize: "medium",
});

function isWebSearchOutput(output: unknown): output is {
  action?: {
    type: string;
    query?: string;
    queries?: string[];
  };
  sources?: Array<{ type: string; url?: string; name?: string }>;
} {
  return !!output && typeof output === "object";
}

export async function webVerify(query: string) {
  const search = await generateText({
    model: openai(WEB_VERIFY_MODEL),
    prompt: `Use web search to verify this claim: ${query}`,
    tools: {
      web_search: webSearchTool,
    },
    toolChoice: { type: "tool", toolName: "web_search" },
  });

  const toolResult = [...search.toolResults, ...search.staticToolResults].find(
    (result) => result.toolName === "web_search",
  );
  const output = toolResult?.output;
  const sourceUrls = new Set<string>();

  if (isWebSearchOutput(output) && Array.isArray(output.sources)) {
    for (const source of output.sources) {
      if (source.type === "url" && typeof source.url === "string") {
        sourceUrls.add(source.url);
      }
    }
  }

  for (const source of search.sources) {
    if ("url" in source && typeof source.url === "string") {
      sourceUrls.add(source.url);
    }
  }

  const results: SearchSnippet[] = [...sourceUrls].map((url) => ({
    title: url,
    url,
    snippet: "",
  }));

  return {
    query,
    provider: "openai_web_search" as const,
    resultCount: results.length,
    results,
    urls: results.map((r) => r.url),
  };
}
