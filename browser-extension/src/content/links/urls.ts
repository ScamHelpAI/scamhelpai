/**
 * Collect and normalize http(s) hrefs from anchor elements.
 */

export function normalizeHttpUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveAnchorUrl(
  anchor: HTMLAnchorElement,
  baseHref: string = location.href,
): string | null {
  const raw = anchor.getAttribute("href");
  if (raw === null || raw.trim() === "") return null;

  try {
    return normalizeHttpUrl(new URL(raw, baseHref).toString());
  } catch {
    return null;
  }
}

