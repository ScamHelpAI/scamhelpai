import * as cheerio from "cheerio";
import { safeFetch, readResponseText } from "./shared/fetch-safe.js";
import { tool } from "ai";
import { z } from "zod";

const URL_RE = /https?:\/\/[^\s"'<>]+/gi;

export async function inspectPage(url: string) {
  const response = await safeFetch(url, {
    headers: { "User-Agent": "ScamHelpAI/1.0" },
  });
  const html = await readResponseText(response);
  const $ = cheerio.load(html);

  $("script, style, noscript").remove();
  const title = $("title").text().trim();
  const description =
    $('meta[name="description"]').attr("content")?.trim() ?? null;

  const forms = $("form")
    .map((_, el) => {
      const form = $(el);
      return {
        action: form.attr("action") ?? null,
        method: (form.attr("method") ?? "get").toLowerCase(),
        hasPasswordField: form.find('input[type="password"]').length > 0,
        hasEmailField:
          form.find('input[type="email"], input[name*="email" i]').length > 0,
        inputCount: form.find("input").length,
      };
    })
    .get();

  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .filter(Boolean)
    .slice(0, 100);

  const scripts = $("script[src]")
    .map((_, el) => $(el).attr("src") ?? "")
    .get()
    .filter(Boolean)
    .slice(0, 50);

  const visibleText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  const parsedUrl = new URL(url);
  const externalLinks = links.filter((href) => {
    try {
      const linkUrl = new URL(href, url);
      return linkUrl.hostname !== parsedUrl.hostname;
    } catch {
      return false;
    }
  });

  return {
    url,
    status: response.status,
    title,
    description,
    forms,
    linkCount: links.length,
    externalLinkCount: externalLinks.length,
    externalLinks: externalLinks.slice(0, 20),
    scriptSources: scripts,
    visibleText,
    embeddedUrls: [...new Set(html.match(URL_RE) ?? [])].slice(0, 30),
  };
}

export const inspectPageTool = tool({
  description:
    "Fetches page metadata and content: title, forms, outbound links, credential fields, scripts, and visible text.",
  inputSchema: z.object({
    url: z.string().url().describe("The page URL to inspect"),
  }),
  execute: async ({ url }) => inspectPage(url),
});
