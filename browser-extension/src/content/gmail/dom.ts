import { ANNOTATE_ROOT_ATTR } from "../annotations/decorate.ts";

/** Stable-ish Gmail open-message markers (DOM can change). */
export const MESSAGE_CONTAINER_SELECTOR = "[data-legacy-message-id]";
export const MESSAGE_BODY_SELECTOR = "div.a3s";
export const SUBJECT_SELECTOR = "h2[data-thread-perm-id]";

const MAX_EMAIL_CHARS = 20_000;

export type OpenGmailMessage = {
  container: HTMLElement;
  body: HTMLElement;
  subject: string;
  from: string;
  text: string;
};

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

export function findOpenMessageContainers(
  doc: Document = document,
): HTMLElement[] {
  return [...doc.querySelectorAll(MESSAGE_CONTAINER_SELECTOR)].filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && isVisible(node),
  );
}

function readableText(el: HTMLElement): string {
  const raw = el.innerText || el.textContent || "";
  return raw.replace(/\s+\n/g, "\n").trim();
}

/** Gmail renders several `div.a3s` per message (body, quoted text, stray separators); the main body has the most text. */
export function findMessageBody(
  container: HTMLElement,
): { body: HTMLElement; text: string } | null {
  let best: { body: HTMLElement; text: string } | null = null;
  for (const node of container.querySelectorAll(MESSAGE_BODY_SELECTOR)) {
    if (!(node instanceof HTMLElement) || !isVisible(node)) continue;
    const text = readableText(node);
    if (!best || text.length > best.text.length) {
      best = { body: node, text };
    }
  }
  return best && best.text ? best : null;
}

/** Prefer the last visible message in the open thread (usually the newest). */
export function findOpenMessage(
  doc: Document = document,
): OpenGmailMessage | null {
  const containers = findOpenMessageContainers(doc);
  if (containers.length === 0) return null;

  for (let i = containers.length - 1; i >= 0; i -= 1) {
    const container = containers[i];
    const found = findMessageBody(container);
    if (!found) continue;
    const { body, text: bodyText } = found;

    const subject =
      doc.querySelector(SUBJECT_SELECTOR)?.textContent?.trim() ?? "";
    const fromEl = container.querySelector("span[email]");
    const fromName = fromEl?.getAttribute("name")?.trim() ?? "";
    const fromEmail = fromEl?.getAttribute("email")?.trim() ?? "";
    const from =
      fromName && fromEmail
        ? `${fromName} <${fromEmail}>`
        : fromEmail || fromName;

    const parts = [
      subject ? `Subject: ${subject}` : null,
      from ? `From: ${from}` : null,
      bodyText,
    ].filter(Boolean);

    const text = parts.join("\n\n").slice(0, MAX_EMAIL_CHARS);

    return { container, body, subject, from, text };
  }

  return null;
}

export function markAnnotateRoot(
  body: HTMLElement,
  doc: Document = document,
): void {
  for (const el of doc.querySelectorAll(`[${ANNOTATE_ROOT_ATTR}]`)) {
    el.removeAttribute(ANNOTATE_ROOT_ATTR);
  }
  body.setAttribute(ANNOTATE_ROOT_ATTR, "1");
}

export function annotateRootSelector(): string {
  return `[${ANNOTATE_ROOT_ATTR}]`;
}
