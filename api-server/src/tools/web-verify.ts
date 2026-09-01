import { generateText, gateway } from "ai";

type SearchSnippet = {
  title: string;
  url: string;
  snippet: string;
};

const PARALLEL_MODEL = "openai/gpt-5.6-luna" as Parameters<typeof gateway>[0];

export const parallelSearchTool = gateway.tools.parallelSearch({
  mode: "agentic",
  maxResults: 5,
  excerpts: {
    maxCharsPerResult: 2000,
    maxCharsTotal: 7500,
  },
});

function isSearchResponse(output: unknown): output is {
  results: Array<{ title: string; url: string; excerpt: string }>;
} {
  if (!output || typeof output !== "object" || !("results" in output)) {
    return false;
  }

  const results = (output as { results?: unknown }).results;
  return (
    Array.isArray(results) &&
    results.every(
      (result) =>
        result &&
        typeof result === "object" &&
        typeof (result as { title?: unknown }).title === "string" &&
        typeof (result as { url?: unknown }).url === "string" &&
        typeof (result as { excerpt?: unknown }).excerpt === "string",
    )
  );
}

export async function webVerify(query: string) {
  const search = await generateText({
    model: gateway(PARALLEL_MODEL),
    prompt: `Use web search to verify this claim: ${query}`,
    tools: {
      parallel_search: parallelSearchTool,
    },
    toolChoice: { type: "tool", toolName: "parallel_search" },
  });

  const toolResult = [...search.toolResults, ...search.staticToolResults].find(
    (result) => result.toolName === "parallel_search",
  );
  const output = toolResult?.output;
  const results: SearchSnippet[] = isSearchResponse(output)
    ? output.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.excerpt,
      }))
    : [];

  return {
    query,
    provider: "parallel" as const,
    resultCount: results.length,
    results,
    urls: results.map((r) => r.url),
  };
}
