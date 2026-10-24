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

function formatAddress(name: string, email: string): string {
  if (name && email) return `${name} <${email}>`;
  return email || name;
}

function readAddressSpans(container: HTMLElement): string[] {
  const addresses: string[] = [];
  for (const el of container.querySelectorAll("span[email]")) {
    if (!(el instanceof HTMLElement)) continue;
    const email = el.getAttribute("email")?.trim() ?? "";
    const name = el.getAttribute("name")?.trim() ?? "";
    const formatted = formatAddress(name, email);
    if (!formatted) continue;
    if (addresses.includes(formatted)) continue;
    addresses.push(formatted);
  }
  return addresses;
}

/** Build plain text for the shared /v1/analyses text input. */
export function formatEmailAnalyzeText(params: {
  from: string;
  cc: string[];
  subject: string;
  body: string;
}): string {
  const lines: string[] = [];
  if (params.from) lines.push(`From: ${params.from}`);
  if (params.cc.length > 0) lines.push(`CC: ${params.cc.join(", ")}`);
  if (params.subject) lines.push(`Subject: ${params.subject}`);
  if (lines.length > 0) lines.push("");
  lines.push(params.body);
  return lines.join("\n").slice(0, MAX_EMAIL_CHARS);
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
    const addresses = readAddressSpans(container);
    const from = addresses[0] ?? "";
    const cc = addresses.slice(1);

    const text = formatEmailAnalyzeText({
      from,
      cc,
      subject,
      body: bodyText,
    });

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
