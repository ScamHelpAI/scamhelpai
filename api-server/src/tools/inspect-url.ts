import { connect } from "node:tls";
import { toASCII } from "node:punycode";
import { traceRedirects } from "./shared/redirect-tracer.js";
import { tool } from "ai";
import { z } from "zod";

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

function certField(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function getTlsInfo(hostname: string): Promise<{
  valid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: string;
  validTo?: string;
} | null> {
  return new Promise((resolve) => {
    const socket = connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || Object.keys(cert).length === 0) {
          resolve({ valid: false });
          return;
        }
        resolve({
          valid: socket.authorized,
          issuer: certField(cert.issuer?.O) ?? certField(cert.issuer?.CN),
          subject: certField(cert.subject?.CN),
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
        });
      },
    );
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(null);
    });
    socket.on("error", () => resolve(null));
  });
}

export async function inspectUrl(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const asciiHostname = toASCII(hostname);
  const flags: string[] = [];

  if (parsed.username || parsed.password) flags.push("embedded_credentials");
  if (url.includes("@")) flags.push("at_symbol_in_url");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) flags.push("ip_hostname");
  if (asciiHostname !== hostname) flags.push("punycode_hostname");
  if (countSubdomains(hostname) >= 3) flags.push("excessive_subdomains");

  const tld = hostname.split(".").pop();
  if (tld && SUSPICIOUS_TLDS.has(tld)) flags.push("suspicious_tld");

  const { hops, finalUrl } = await traceRedirects(url);

  const tls =
    parsed.protocol === "https:" ? await getTlsInfo(hostname) : null;

  return {
    normalized: parsed.toString(),
    hostname,
    asciiHostname,
    scheme: parsed.protocol.replace(":", ""),
    port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
    flags,
    redirectCount: Math.max(0, hops.length - 1),
    finalDestination: finalUrl,
    tls,
  };
}

export const inspectUrlTool = tool({
  description:
    "Returns normalized URL, redirect chain summary, final destination, HTTPS/certificate info, and suspicious URL features.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to inspect"),
  }),
  execute: async ({ url }) => inspectUrl(url),
});
