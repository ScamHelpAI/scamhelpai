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

/** Prefer the last visible message in the open thread (usually the newest). */
export function findOpenMessage(
  doc: Document = document,
): OpenGmailMessage | null {
  const containers = findOpenMessageContainers(doc);
  if (containers.length === 0) return null;

  for (let i = containers.length - 1; i >= 0; i -= 1) {
    const container = containers[i];
    const body = container.querySelector(MESSAGE_BODY_SELECTOR);
    if (!(body instanceof HTMLElement) || !isVisible(body)) continue;

    const subject =
      doc.querySelector(SUBJECT_SELECTOR)?.textContent?.trim() ?? "";
    const fromEl = container.querySelector("span[email]");
    const fromName = fromEl?.getAttribute("name")?.trim() ?? "";
    const fromEmail = fromEl?.getAttribute("email")?.trim() ?? "";
    const from =
      fromName && fromEmail
        ? `${fromName} <${fromEmail}>`
        : fromEmail || fromName;

    const rawBody = body.innerText || body.textContent || "";
    const bodyText = rawBody.replace(/\s+\n/g, "\n").trim();
    if (!bodyText) continue;

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

export function markAnnotateRoot(body: HTMLElement, doc: Document = document): void {
  for (const el of doc.querySelectorAll(`[${ANNOTATE_ROOT_ATTR}]`)) {
    el.removeAttribute(ANNOTATE_ROOT_ATTR);
  }
  body.setAttribute(ANNOTATE_ROOT_ATTR, "1");
}

export function annotateRootSelector(): string {
  return `[${ANNOTATE_ROOT_ATTR}]`;
}
