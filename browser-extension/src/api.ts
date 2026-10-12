import { emailToAnalyzeRequest } from "./email-request.ts";
import type { GmailEmail } from "./content/gmail-read.ts";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisResult,
} from "./types.ts";

function isPageUrl(url: string | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

export function isGmailUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith("https://mail.google.com/"));
}

export async function getActiveTabUrl(): Promise<string> {
  const tab = await getActiveTab();
  if (!isPageUrl(tab?.url)) {
    throw new Error("Open a normal http or https page first.");
  }
  return tab.url;
}

export async function analyze(
  request: AnalyzeRequest,
): Promise<AnalysisResult> {
  const response = (await chrome.runtime.sendMessage({
    type: "analyze",
    request,
  })) as AnalyzeResponse | undefined;

  if (!response?.ok) {
    throw new Error(
      response && "error" in response
        ? response.error
        : "Is the ScamHelp server running?",
    );
  }

  return response.result;
}

export async function readOpenEmail(): Promise<GmailEmail> {
  const tab = await getActiveTab();
  if (!tab?.id || !isGmailUrl(tab.url)) {
    throw new Error("Open Gmail and click on an email first, then try again.");
  }

  let message: { ok: true; email: GmailEmail } | { ok: false } | undefined;
  try {
    message = await chrome.tabs.sendMessage(tab.id, { type: "readOpenEmail" });
  } catch {
    throw new Error("Please reload the Gmail tab, then try again.");
  }

  if (!message?.ok) {
    throw new Error("Open an email in Gmail first, then try again.");
  }

  return message.email;
}

export async function checkOpenEmail(): Promise<AnalysisResult> {
  const tab = await getActiveTab();
  const email = await readOpenEmail();
  return analyze(emailToAnalyzeRequest(email, tab?.url));
}
