export const BUTTON_ATTR = "data-scamhelp-gmail-btn";
export const BUTTON_HOST_ATTR = "data-scamhelp-gmail-btn-host";

export type GmailButtonState = "idle" | "loading" | "done" | "error";

const STYLE_ID = "scamhelp-gmail-button-styles";

export function ensureButtonStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [${BUTTON_HOST_ATTR}] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 12px;
    }
    [${BUTTON_ATTR}] {
      appearance: none;
      border: 2px solid #b8650a;
      border-radius: 999px;
      background: #fff7ed;
      color: #7c3a0a;
      font: 600 13px/1.2 system-ui, sans-serif;
      padding: 8px 14px;
      cursor: pointer;
    }
    [${BUTTON_ATTR}]:disabled {
      opacity: 0.7;
      cursor: wait;
    }
    [${BUTTON_ATTR}][data-state="error"] {
      border-color: #c62828;
      background: #fce4e1;
      color: #7f1d1d;
    }
    [${BUTTON_ATTR}][data-state="done"] {
      border-color: #2e7d32;
      background: #e8f5e9;
      color: #1b5e20;
    }
    [${BUTTON_HOST_ATTR}] [data-scamhelp-gmail-status] {
      font: 13px/1.3 system-ui, sans-serif;
      color: #64748b;
    }
  `;
  doc.documentElement.appendChild(style);
}

export function setButtonState(
  button: HTMLButtonElement,
  state: GmailButtonState,
  statusEl: HTMLElement | null,
  message?: string,
): void {
  button.dataset.state = state;
  switch (state) {
    case "idle":
      button.disabled = false;
      button.textContent = "Check with ScamHelp";
      if (statusEl) statusEl.textContent = "";
      break;
    case "loading":
      button.disabled = true;
      button.textContent = "Checking…";
      if (statusEl) statusEl.textContent = "Analyzing this email…";
      break;
    case "done":
      button.disabled = false;
      button.textContent = "Check again";
      if (statusEl) statusEl.textContent = message ?? "Check complete.";
      break;
    case "error":
      button.disabled = false;
      button.textContent = "Try again";
      if (statusEl) {
        statusEl.textContent = message ?? "Could not check this email.";
      }
      break;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function injectScanButton(
  container: HTMLElement,
  onClick: (button: HTMLButtonElement) => void,
  doc: Document = document,
): HTMLButtonElement {
  ensureButtonStyles(doc);

  const existing = container.querySelector(`[${BUTTON_ATTR}]`);
  if (existing instanceof HTMLButtonElement) {
    return existing;
  }

  const host = doc.createElement("div");
  host.setAttribute(BUTTON_HOST_ATTR, "1");

  const button = doc.createElement("button");
  button.type = "button";
  button.setAttribute(BUTTON_ATTR, "1");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick(button);
  });

  const status = doc.createElement("span");
  status.setAttribute("data-scamhelp-gmail-status", "1");

  setButtonState(button, "idle", status);
  host.append(button, status);

  const body = container.querySelector("div.a3s");
  if (body?.parentElement) {
    body.parentElement.insertBefore(host, body);
  } else {
    container.prepend(host);
  }

  return button;
}

export function getButtonStatusEl(
  button: HTMLButtonElement,
): HTMLElement | null {
  const host = button.closest(`[${BUTTON_HOST_ATTR}]`);
  const status = host?.querySelector("[data-scamhelp-gmail-status]");
  return status instanceof HTMLElement ? status : null;
}
