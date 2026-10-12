export type GmailEmail = {
  subject: string;
  senderName: string;
  senderAddress: string;
  body: string;
  links: string[];
};

export function openedMessageNode(doc: Document): Element | null {
  const messages = doc.querySelectorAll("div.adn.ads");
  return messages[messages.length - 1] ?? null;
}

function elementText(el: Element | null): string {
  if (!el) return "";
  const htmlEl = el as HTMLElement;
  return (htmlEl.innerText || htmlEl.textContent || "").trim();
}

export function readEmail(doc: Document): GmailEmail | null {
  const node = openedMessageNode(doc);
  if (!node) return null;

  const subject = elementText(doc.querySelector("h2.hP"));
  const senderEl = node.querySelector("span.gD, span[email]");
  const senderName =
    senderEl?.getAttribute("name") || elementText(senderEl);
  const senderAddress = senderEl?.getAttribute("email") || "";

  const bodyEl = node.querySelector("div.a3s");
  const body = elementText(bodyEl);

  const links = [
    ...new Set(
      [...(bodyEl?.querySelectorAll("a[href]") ?? [])]
        .map((anchor) => (anchor as HTMLAnchorElement).href)
        .filter((href) => /^https?:/i.test(href))
        .filter((href) => !href.startsWith("https://mail.google.com/")),
    ),
  ];

  if (!body && !subject) return null;

  return { subject, senderName, senderAddress, body, links };
}
