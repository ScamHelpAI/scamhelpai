import { env } from "../config/env.js";
import {
  detectIndicatorType,
  type IndicatorType,
} from "./shared/indicator-type.js";
import {
  checkVtDomain,
  checkVtHash,
  checkVtIp,
  checkVtUrl,
  type VtReport,
} from "./shared/virustotal.js";
import { tool } from "ai";
import { z } from "zod";

type ThreatSource = {
  name: string;
  malicious: boolean;
  score?: number;
  categories?: string[];
  details?: string;
};

async function checkPhishTank(url: string): Promise<ThreatSource | null> {
  if (!env.PHISHTANK_API_KEY) return null;

  const body = new URLSearchParams({
    url,
    format: "json",
    app_key: env.PHISHTANK_API_KEY,
  });

  const response = await fetch("https://checkurl.phishtank.com/checkurl/", {
    method: "POST",
    headers: { "User-Agent": "ScamHelpAI/1.0" },
    body,
  });

  if (!response.ok) return null;

  const json = (await response.json()) as {
    results?: { in_database?: boolean; verified?: boolean };
  };

  const inDatabase = json.results?.in_database ?? false;
  return {
    name: "PhishTank",
    malicious: inDatabase,
    details: inDatabase ? "Listed in PhishTank database" : "Not in PhishTank",
  };
}

async function checkUrlhaus(url: string): Promise<ThreatSource | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (env.URLHAUS_AUTH_KEY) {
    headers["Auth-Key"] = env.URLHAUS_AUTH_KEY;
  }

  const response = await fetch("https://urlhaus-api.abuse.ch/v1/url/", {
    method: "POST",
    headers,
    body: new URLSearchParams({ url }),
  });

  if (!response.ok) return null;

  const json = (await response.json()) as {
    query_status: string;
    url_status?: string;
    threat?: string;
  };

  const listed = json.query_status === "ok";
  return {
    name: "URLhaus",
    malicious: listed,
    categories: json.threat ? [json.threat] : undefined,
    details: listed ? `Status: ${json.url_status ?? "listed"}` : "Not listed",
  };
}

async function checkAbuseIpdb(ip: string): Promise<ThreatSource | null> {
  if (!env.ABUSEIPDB_API_KEY) return null;

  const response = await fetch(
    `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
    {
      headers: {
        Key: env.ABUSEIPDB_API_KEY,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) return null;

  const json = (await response.json()) as {
    data?: { abuseConfidenceScore?: number; totalReports?: number };
  };

  const score = json.data?.abuseConfidenceScore ?? 0;
  return {
    name: "AbuseIPDB",
    malicious: score >= 50,
    score,
    details: `${json.data?.totalReports ?? 0} reports, confidence ${score}%`,
  };
}

function vtToSource(report: VtReport): ThreatSource {
  return {
    name: "VirusTotal",
    malicious: report.malicious > 0 || report.suspicious > 2,
    score: report.malicious + report.suspicious,
    categories: report.sources
      .filter((s) => s.category)
      .map((s) => s.category as string),
    details: `${report.malicious} malicious, ${report.suspicious} suspicious`,
  };
}

async function queryByType(
  indicator: string,
  type: IndicatorType,
): Promise<ThreatSource[]> {
  const sources: ThreatSource[] = [];

  if (type === "url") {
    const [vt, phishTank, urlhaus] = await Promise.all([
      checkVtUrl(indicator),
      checkPhishTank(indicator),
      checkUrlhaus(indicator),
    ]);
    if (vt) sources.push(vtToSource(vt));
    if (phishTank) sources.push(phishTank);
    if (urlhaus) sources.push(urlhaus);
    return sources;
  }

  if (type === "domain") {
    const vt = await checkVtDomain(indicator);
    if (vt) sources.push(vtToSource(vt));
    return sources;
  }

  if (type === "ip") {
    const [vt, abuse] = await Promise.all([
      checkVtIp(indicator),
      checkAbuseIpdb(indicator),
    ]);
    if (vt) sources.push(vtToSource(vt));
    if (abuse) sources.push(abuse);
    return sources;
  }

  if (type === "hash") {
    const vt = await checkVtHash(indicator);
    if (vt) sources.push(vtToSource(vt));
    return sources;
  }

  return sources;
}

export async function checkThreatIntel(indicator: string) {
  const type = detectIndicatorType(indicator);
  const sources = await queryByType(indicator, type);

  return {
    indicator,
    type,
    malicious: sources.some((s) => s.malicious),
    sources,
  };
}

export const checkThreatIntelTool = tool({
  description:
    "Checks URLs, domains, IPs, and file hashes against threat intelligence sources.",
  inputSchema: z.object({
    indicator: z
      .string()
      .describe("URL, domain, IP address, or file hash to check"),
  }),
  execute: async ({ indicator }) => checkThreatIntel(indicator),
});
