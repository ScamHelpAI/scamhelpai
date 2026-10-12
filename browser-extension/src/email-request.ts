import type { GmailEmail } from "./content/gmail-read.ts";
import type { AnalyzeRequest } from "./types.ts";

const MAX_CHARS = 20_000;

function senderFrom(email: GmailEmail): string {
  if (email.senderName && email.senderAddress) {
    return `${email.senderName} <${email.senderAddress}>`;
  }
  return email.senderAddress || email.senderName;
}

function emailBody(email: GmailEmail): string {
  const links = email.links.length
    ? `\nLinks in this email:\n${email.links.join("\n")}`
    : "";
  return `${email.body}${links}`.slice(0, MAX_CHARS);
}

export function emailToAnalyzeRequest(
  email: GmailEmail,
  pageUrl?: string,
): AnalyzeRequest {
  return {
    inputs: [
      {
        type: "email",
        headers: {
          From: senderFrom(email),
          Subject: email.subject,
        },
        body: emailBody(email),
      },
    ],
    context: {
      source: "browser_extension",
      ...(pageUrl ? { pageUrl } : {}),
    },
  };
}

export function textToAnalyzeRequest(text: string): AnalyzeRequest {
  return {
    inputs: [{ type: "text", content: text.slice(0, MAX_CHARS) }],
    context: { source: "browser_extension" },
  };
}

export function urlToAnalyzeRequest(pageUrl: string): AnalyzeRequest {
  return {
    inputs: [{ type: "url", url: pageUrl }],
    context: {
      source: "browser_extension",
      pageUrl,
    },
  };
}
