import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    return second >= 16 && second <= 31;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) {
    return true;
  }
  return false;
}

async function resolveHostname(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];

  const [ipv4, ipv6] = await Promise.allSettled([
    lookup(hostname, { family: 4 }),
    lookup(hostname, { family: 6 }),
  ]);

  const addresses: string[] = [];
  if (ipv4.status === "fulfilled") addresses.push(ipv4.value.address);
  if (ipv6.status === "fulfilled") addresses.push(ipv6.value.address);
  return addresses;
}

export async function assertSafeUrl(url: string): Promise<URL> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  const addresses = await resolveHostname(hostname);
  if (addresses.length === 0) {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }

  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`Blocked private or local address: ${address}`);
    }
  }

  return parsed;
}

export type SafeFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  redirect?: RequestRedirect;
  timeoutMs?: number;
  maxBytes?: number;
};

export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<Response> {
  const parsed = await assertSafeUrl(url);
  const {
    method = "GET",
    headers,
    body,
    redirect = "follow",
    timeoutMs = 10_000,
    maxBytes = 2_000_000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsed.toString(), {
      method,
      headers,
      body,
      redirect,
      signal: controller.signal,
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxBytes) {
      throw new Error(`Response too large: ${contentLength} bytes`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readResponseText(
  response: Response,
  maxBytes = 2_000_000,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error(`Response body exceeds ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}
