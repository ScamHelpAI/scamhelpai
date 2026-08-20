import { env } from "../config/env.js";
import { tool } from "ai";
import { z } from "zod";

type SearchSnippet = {
  title: string;
  url: string;
  snippet: string;
};

async function searchTavily(query: string): Promise<SearchSnippet[]> {
  if (!env.TAVILY_API_KEY) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!response.ok) return [];

  const json = (await response.json()) as {
    results?: Array<{ title: string; url: string; content: string }>;
  };

  return (json.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}

async function searchSerper(query: string): Promise<SearchSnippet[]> {
  if (!env.SERPER_API_KEY) return [];

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.SERPER_API_KEY,
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!response.ok) return [];

  const json = (await response.json()) as {
    organic?: Array<{ title: string; link: string; snippet: string }>;
  };

  return (json.organic ?? []).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }));
}

export async function webVerify(query: string) {
  let results = await searchTavily(query);
  let provider: "tavily" | "serper" | "none" =
    results.length > 0 ? "tavily" : "none";

  if (results.length === 0) {
    results = await searchSerper(query);
    if (results.length > 0) provider = "serper";
  }

  return {
    query,
    provider,
    resultCount: results.length,
    results,
    urls: results.map((r) => r.url),
  };
}

export const webVerifyTool = tool({
  description:
    'Constrained web search for factual verification, e.g. "Does Apple request gift card payments?" or "Is this Microsoft support number official?"',
  inputSchema: z.object({
    query: z.string().describe("Factual verification query to search for"),
  }),
  execute: async ({ query }) => webVerify(query),
});
