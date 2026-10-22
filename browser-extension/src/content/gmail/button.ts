import type { VerdictTone } from "../../shared/verdict.ts";

export const BUTTON_ATTR = "data-scamhelp-gmail-btn";
export const BUTTON_HOST_ATTR = "data-scamhelp-gmail-btn-host";
export const BUTTON_TONE_ATTR = "data-tone";

export type GmailButtonState =
  | "idle"
  | "loading"
  | "reviewing"
  | "done"
  | "error";

export type SetButtonStateOptions = {
  message?: string;
  tone?: VerdictTone;
  label?: string;
};

const STYLE_ID = "scamhelp-gmail-button-styles";

/** Match popup risk tokens from popup/styles.css */
const TONE_STYLES: Record<
  VerdictTone | "brand",
  { border: string; bg: string; color: string }
> = {
  brand: { border: "#b8650a", bg: "#fff7ed", color: "#7c3a0a" },
  danger: { border: "#b3261e", bg: "#fbe9e7", color: "#b3261e" },
  warn: { border: "#6b4200", bg: "#fff3e0", color: "#4a2e00" },
  safe: { border: "#1e6b34", bg: "#e6f4ea", color: "#1e6b34" },
};

export function ensureButtonStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  const toneRules = (
    Object.entries(TONE_STYLES) as Array<
      [keyof typeof TONE_STYLES, (typeof TONE_STYLES)[keyof typeof TONE_STYLES]]
    >
  )
    .map(
      ([tone, colors]) => `
    [${BUTTON_ATTR}][${BUTTON_TONE_ATTR}="${tone}"] {
      border-color: ${colors.border};
      background: ${colors.bg};
      color: ${colors.color};
    }`,
    )
    .join("");

  style.textContent = `
    [${BUTTON_HOST_ATTR}] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 12px;
      flex-wrap: wrap;
    }
    [${BUTTON_ATTR}] {
      appearance: none;
      border: 2px solid;
      border-radius: 999px;
      font: 600 13px/1.2 system-ui, sans-serif;
      padding: 8px 14px;
      cursor: pointer;
      box-shadow: 0 0 0 3px transparent;
      transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }
    ${toneRules}
    [${BUTTON_ATTR}][${BUTTON_TONE_ATTR}="danger"] {
      box-shadow: 0 0 0 3px rgba(179, 38, 30, 0.2);
    }
    [${BUTTON_ATTR}][${BUTTON_TONE_ATTR}="warn"] {
      box-shadow: 0 0 0 3px rgba(107, 66, 0, 0.15);
    }
    [${BUTTON_ATTR}][${BUTTON_TONE_ATTR}="safe"] {
      box-shadow: 0 0 0 3px rgba(30, 107, 52, 0.15);
    }
    [${BUTTON_ATTR}]:disabled {
      opacity: 0.92;
      cursor: wait;
    }
    [${BUTTON_HOST_ATTR}] [data-scamhelp-gmail-status] {
      font: 13px/1.3 system-ui, sans-serif;
      color: #64748b;
      flex: 1;
      min-width: 12rem;
    }
  `;
  doc.documentElement.appendChild(style);
}

function applyButtonTone(
  button: HTMLButtonElement,
  tone: VerdictTone | "brand",
): void {
  button.setAttribute(BUTTON_TONE_ATTR, tone);
}

export function setButtonState(
  button: HTMLButtonElement,
  state: GmailButtonState,
  statusEl: HTMLElement | null,
  options?: SetButtonStateOptions,
): void {
  button.dataset.state = state;
  switch (state) {
    case "idle":
      applyButtonTone(button, "brand");
      button.disabled = false;
      button.textContent = "Check with ScamHelp";
      if (statusEl) statusEl.textContent = "";
      break;
    case "loading":
      applyButtonTone(button, "brand");
      button.disabled = true;
      button.textContent = "Checking…";
      if (statusEl) statusEl.textContent = "Sending this email to ScamHelp…";
      break;
    case "reviewing":
      applyButtonTone(button, options?.tone ?? "warn");
      button.disabled = true;
      button.textContent = options?.label ?? "Quick result";
      if (statusEl) {
        statusEl.textContent =
          options?.message ?? "Quick check done — finding risky phrases…";
      }
      break;
    case "done":
      applyButtonTone(button, options?.tone ?? "safe");
      button.disabled = false;
      button.textContent = options?.label ?? "Check again";
      if (statusEl) statusEl.textContent = options?.message ?? "Check complete.";
      break;
    case "error":
      applyButtonTone(button, "danger");
      button.disabled = false;
      button.textContent = "Try again";
      if (statusEl) {
        statusEl.textContent = options?.message ?? "Could not check this email.";
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
