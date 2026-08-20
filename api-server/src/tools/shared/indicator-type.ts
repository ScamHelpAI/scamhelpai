export type IndicatorType = "url" | "domain" | "ip" | "hash" | "unknown";

const SHA256_RE = /^[a-f0-9]{64}$/i;
const MD5_RE = /^[a-f0-9]{32}$/i;
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function detectIndicatorType(indicator: string): IndicatorType {
  const value = indicator.trim();

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return "url";
  }
  if (SHA256_RE.test(value) || MD5_RE.test(value)) {
    return "hash";
  }
  if (IPV4_RE.test(value)) {
    return "ip";
  }
  if (DOMAIN_RE.test(value)) {
    return "domain";
  }
  return "unknown";
}
