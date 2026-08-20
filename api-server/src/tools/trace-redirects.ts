import { traceRedirects } from "./shared/redirect-tracer.js";
import { tool } from "ai";
import { z } from "zod";

export async function traceRedirectsTool_impl(url: string) {
  const { hops, finalUrl } = await traceRedirects(url);
  return {
    startUrl: url,
    hopCount: hops.length,
    hops,
    finalUrl,
  };
}

export const traceRedirectsTool = tool({
  description:
    "Traces the full redirect chain for a URL, useful for URL shorteners and multi-hop redirects.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to trace"),
  }),
  execute: async ({ url }) => traceRedirectsTool_impl(url),
});
