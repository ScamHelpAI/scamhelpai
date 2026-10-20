import { createHash } from "node:crypto";

export function normalizeCheckUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if (
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
  ) {
    parsed.port = "";
  }

  return parsed.toString();
}

export function hostnameFromCheckUrl(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

export function urlCheckHash(normalizedUrl: string): string {
  return createHash("sha256").update(normalizedUrl).digest("hex");
}

export function redisUrlKey(urlHash: string): string {
  return `check:url:${urlHash}`;
}

export function redisDomainKey(hostname: string): string {
  return `check:domain:${hostname}`;
}

export function redisUrlHitsKey(urlHash: string): string {
  return `check:hits:url:${urlHash}`;
}

export function redisDomainHitsKey(hostname: string): string {
  return `check:hits:domain:${hostname}`;
}
