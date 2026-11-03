import { BUTTON_ATTR, injectScanButton } from "./button.ts";
import { findOpenMessage } from "./dom.ts";
import type { AnalyzeOpenEmailMessage } from "../../shared/messages.ts";
import { scanOpenGmailEmail } from "./scan.ts";

const INSTALLED_FLAG = "__scamhelpGmailInstalled";

type GmailWindow = Window & {
  [INSTALLED_FLAG]?: boolean;
};

let syncScheduled = false;

function ensureButtonForOpenEmail(): HTMLButtonElement | null {
  const open = findOpenMessage(document);
  if (!open) return null;

  const existing = open.container.querySelector(`[${BUTTON_ATTR}]`);
  if (existing instanceof HTMLButtonElement) return existing;

  return injectScanButton(open.container, (button) => {
    void scanOpenGmailEmail(button, document);
  });
}

function scheduleEnsureButton(): void {
  if (syncScheduled) return;
  syncScheduled = true;
  queueMicrotask(() => {
    syncScheduled = false;
    ensureButtonForOpenEmail();
  });
}

function startGmailIntegration(): void {
  ensureButtonForOpenEmail();

  const observer = new MutationObserver(() => {
    scheduleEnsureButton();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("hashchange", () => {
    scheduleEnsureButton();
  });

  // Right-click "Analyze Email": run exactly what the button click runs.
  chrome.runtime.onMessage.addListener((message: AnalyzeOpenEmailMessage) => {
    if (message?.type !== "analyzeOpenEmail") return false;
    const button = ensureButtonForOpenEmail();
    if (button && !button.disabled) void scanOpenGmailEmail(button, document);
    return false;
  });
}

const gmailWindow = window as GmailWindow;
if (!gmailWindow[INSTALLED_FLAG]) {
  gmailWindow[INSTALLED_FLAG] = true;
  startGmailIntegration();
}
