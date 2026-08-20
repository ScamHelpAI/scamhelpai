import { connect } from "node:tls";
import { toASCII } from "node:punycode";
import { traceRedirects } from "./shared/redirect-tracer.js";
import { tool } from "ai";
import { z } from "zod";
import {
  type UrlInspectionResult,
  urlInspectionResultSchema,
} from "../schemas/tool-result.js";

const SUSPICIOUS_TLDS = new Set([
  "xyz",
  "top",
  "click",
  "link",
  "work",
  "country",
  "gq",
  "tk",
  "ml",
  "cf",
  "ga",
]);

function countSubdomains(hostname: string): number {
  const parts = hostname.split(".");
  return Math.max(0, parts.length - 2);
}

async function getTlsValid(hostname: string): Promise<boolean | null> {
  return new Promise((resolve) => {
    const socket = connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || Object.keys(cert).length === 0) {
          resolve(false);
          return;
        }
        resolve(socket.authorized);
      },
    );
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(null);
    });
    socket.on("error", () => resolve(null));
  });
}

export async function inspectUrl(url: string): Promise<UrlInspectionResult> {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const asciiHostname = toASCII(hostname);
  const suspiciousFeatures: string[] = [];

  if (parsed.username || parsed.password) {
    suspiciousFeatures.push("embedded_credentials");
  }
  if (url.includes("@")) suspiciousFeatures.push("at_symbol_in_url");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    suspiciousFeatures.push("ip_hostname");
  }
  if (asciiHostname !== hostname) suspiciousFeatures.push("punycode_hostname");
  if (countSubdomains(hostname) >= 3) {
    suspiciousFeatures.push("excessive_subdomains");
  }

  const tld = hostname.split(".").pop();
  if (tld && SUSPICIOUS_TLDS.has(tld)) {
    suspiciousFeatures.push("suspicious_tld");
  }

  const { hops, finalUrl } = await traceRedirects(url);
  const redirectChain = hops.map((hop) => hop.url);
  if (redirectChain.at(-1) !== finalUrl) {
    redirectChain.push(finalUrl);
  }

  const usesHttps = parsed.protocol === "https:";
  if (!usesHttps) {
    suspiciousFeatures.push("no_https");
  } else {
    const tlsValid = await getTlsValid(hostname);
    if (tlsValid === false) suspiciousFeatures.push("invalid_tls_certificate");
    if (tlsValid === null) suspiciousFeatures.push("tls_check_failed");
  }

  return urlInspectionResultSchema.parse({
    originalUrl: url,
    normalizedUrl: parsed.toString(),
    finalUrl: finalUrl !== url ? finalUrl : undefined,
    redirectChain,
    hostname,
    usesHttps,
    suspiciousFeatures,
  });
}

export const inspectUrlTool = tool({
  description:
    "Returns normalized URL, redirect chain, final destination, HTTPS status, and suspicious URL features.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to inspect"),
  }),
  execute: async ({ url }) => inspectUrl(url),
});
