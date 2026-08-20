import { simpleParser } from "mailparser";
import { tool } from "ai";
import { z } from "zod";

const URL_RE = /https?:\/\/[^\s"'<>]+/gi;

function extractDisplayName(from: string): {
  name: string | null;
  address: string | null;
} {
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  return {
    name: match?.[1]?.trim() ?? null,
    address: match?.[2]?.trim() ?? null,
  };
}

export async function inspectEmail(headers: string, body: string) {
  const raw = `${headers.trim()}\r\n\r\n${body}`;
  const parsed = await simpleParser(raw);

  const from = parsed.from?.text ?? "";
  const replyTo = parsed.replyTo?.text ?? null;
  const returnPath = parsed.headers.get("return-path") as string | undefined;

  const fromParts = extractDisplayName(from);
  const replyParts = replyTo ? extractDisplayName(replyTo) : null;

  const authResults = parsed.headers.get("authentication-results") as
    | string
    | undefined;
  const spf = authResults?.match(/\bspf=(\w+)/i)?.[1]?.toLowerCase() ?? null;
  const dkim = authResults?.match(/\bdkim=(\w+)/i)?.[1]?.toLowerCase() ?? null;
  const dmarc =
    authResults?.match(/\bdmarc=(\w+)/i)?.[1]?.toLowerCase() ?? null;

  const bodyText = parsed.text ?? "";
  const htmlText = typeof parsed.html === "string" ? parsed.html : "";
  const combined = `${bodyText} ${htmlText}`;
  const urls = [...new Set(combined.match(URL_RE) ?? [])];

  const flags: string[] = [];
  if (replyTo && fromParts.address && replyParts?.address) {
    if (replyParts.address.toLowerCase() !== fromParts.address.toLowerCase()) {
      flags.push("reply_to_mismatch");
    }
  }
  if (returnPath && fromParts.address) {
    const returnAddr = returnPath.replace(/[<>]/g, "").toLowerCase();
    if (!returnAddr.includes(fromParts.address.toLowerCase())) {
      flags.push("return_path_mismatch");
    }
  }
  if (fromParts.name && fromParts.address) {
    const freeProviders = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
    ];
    const domain = fromParts.address.split("@")[1]?.toLowerCase();
    if (fromParts.name.length > 3 && domain && freeProviders.includes(domain)) {
      flags.push("display_name_spoofing");
    }
  }

  return {
    from,
    replyTo,
    returnPath: returnPath ?? null,
    spf,
    dkim,
    dmarc,
    flags,
    urls,
    attachments: (parsed.attachments ?? []).map((a) => ({
      filename: a.filename ?? "unknown",
      contentType: a.contentType,
      size: a.size,
    })),
    subject: parsed.subject ?? null,
  };
}

export const inspectEmailTool = tool({
  description:
    "Parses email headers and body for From, Reply-To, Return-Path, SPF/DKIM/DMARC, sender mismatches, URLs, and attachments.",
  inputSchema: z.object({
    headers: z.string().describe("Raw email headers"),
    body: z.string().describe("Email body (plain text or HTML)"),
  }),
  execute: async ({ headers, body }) => inspectEmail(headers, body),
});
