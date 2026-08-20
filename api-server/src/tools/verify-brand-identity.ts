import { connect } from "node:tls";
import { whoisDomain } from "whoiser";
import {
  getOfficialDomains,
  normalizeBrandName,
  stringSimilarity,
} from "./shared/brands.js";
import { tool } from "ai";
import { z } from "zod";

function certField(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function getTlsSubject(domain: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        resolve(
          certField(cert?.subject?.O) ?? certField(cert?.subject?.CN) ?? null,
        );
      },
    );
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(null);
    });
    socket.on("error", () => resolve(null));
  });
}

export async function verifyBrandIdentity(name: string, domain: string) {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
  const officialDomains = getOfficialDomains(name);
  const exactMatch = officialDomains.some(
    (d) => normalizedDomain === d || normalizedDomain.endsWith(`.${d}`),
  );

  let whoisOrg: string | null = null;
  let whoisSimilarity = 0;
  try {
    const whois = await whoisDomain(normalizedDomain);
    const entry = Object.values(whois)[0] as
      Record<string, unknown> | undefined;
    whoisOrg =
      (entry?.["Registrant Organization"] as string | undefined) ??
      (entry?.["Organization"] as string | undefined) ??
      null;
    if (whoisOrg) {
      whoisSimilarity = stringSimilarity(normalizeBrandName(name), whoisOrg);
    }
  } catch {
    // WHOIS may fail for some TLDs
  }

  const tlsSubject = await getTlsSubject(normalizedDomain);
  const tlsSimilarity = tlsSubject
    ? stringSimilarity(normalizeBrandName(name), tlsSubject)
    : 0;

  const signals = {
    exactDomainMatch: exactMatch,
    officialDomains,
    whoisOrg,
    whoisSimilarity,
    tlsSubject,
    tlsSimilarity,
  };

  const likelyLegitimate =
    exactMatch || whoisSimilarity >= 0.6 || tlsSimilarity >= 0.6;

  return {
    brand: name,
    domain: normalizedDomain,
    likelyLegitimate,
    confidence: exactMatch ? "high" : likelyLegitimate ? "medium" : "low",
    signals,
  };
}

export const verifyBrandIdentityTool = tool({
  description:
    "Checks whether a claimed company or institution likely owns or uses the given domain.",
  inputSchema: z.object({
    name: z.string().describe("Claimed brand or company name"),
    domain: z.string().describe("Domain to verify against the brand"),
  }),
  execute: async ({ name, domain }) => verifyBrandIdentity(name, domain),
});
