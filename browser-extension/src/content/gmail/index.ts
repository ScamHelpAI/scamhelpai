import { BUTTON_ATTR, injectScanButton } from "./button.ts";
import { findOpenMessage } from "./dom.ts";
import { scanOpenGmailEmail } from "./scan.ts";

const INSTALLED_FLAG = "__scamhelpGmailInstalled";

type GmailWindow = Window & {
  [INSTALLED_FLAG]?: boolean;
};

let syncScheduled = false;

function ensureButtonForOpenEmail(): void {
  const open = findOpenMessage(document);
  if (!open) return;

  if (open.container.querySelector(`[${BUTTON_ATTR}]`)) return;

  injectScanButton(open.container, (button) => {
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
}

const gmailWindow = window as GmailWindow;
if (!gmailWindow[INSTALLED_FLAG]) {
  gmailWindow[INSTALLED_FLAG] = true;
  startGmailIntegration();
}
