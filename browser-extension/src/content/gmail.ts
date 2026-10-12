import { emailToAnalyzeRequest } from "../email-request.ts";
import type { AnalyzeResponse } from "../types.ts";
import { toVerdict } from "../verdict.ts";
import { openedMessageNode, readEmail } from "./gmail-read.ts";
import {
  closePanel,
  ensureCheckButton,
  removeCheckButton,
  renderMessage,
  renderResult,
} from "./panel.ts";

async function checkOpenEmail(): Promise<void> {
  const email = readEmail(document);
  if (!email) {
    renderMessage("Open an email first, then press Check this email.");
    return;
  }

  renderMessage("Checking this email… one moment.");

  let response: AnalyzeResponse | undefined;
  try {
    response = await chrome.runtime.sendMessage({
      type: "analyze",
      request: emailToAnalyzeRequest(email, location.href),
    });
  } catch {
    renderMessage(
      "ScamHelp could not run. Try reloading the Gmail tab.",
      "warn",
    );
    return;
  }

  if (!response?.ok) {
    const detail = response && "error" in response ? response.error : "";
    renderMessage(
      `ScamHelp could not check this email. ${detail}`.trim(),
      "warn",
    );
    return;
  }

  renderResult(toVerdict(response.result));
}

function syncGmailUi(): void {
  if (openedMessageNode(document)) {
    ensureCheckButton(() => {
      void checkOpenEmail();
    });
    return;
  }

  removeCheckButton();
  closePanel();
}

const observer = new MutationObserver(syncGmailUi);
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  syncGmailUi();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "readOpenEmail") return false;
  const email = readEmail(document);
  sendResponse(email ? { ok: true, email } : { ok: false });
  return false;
});
