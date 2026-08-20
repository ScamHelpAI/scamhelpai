import { createHash } from "node:crypto";
import { env } from "../../config/env.js";

type VtSource = {
  name: string;
  category: string | null;
  result: string;
};

export type VtReport = {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  sources: VtSource[];
};

function parseVtStats(data: Record<string, unknown>): VtReport {
  const stats = (data.attributes as Record<string, unknown> | undefined)
    ?.last_analysis_stats as Record<string, number> | undefined;
  const results = (data.attributes as Record<string, unknown> | undefined)
    ?.last_analysis_results as
    Record<string, Record<string, string>> | undefined;

  const sources: VtSource[] = [];
  if (results) {
    for (const [name, result] of Object.entries(results)) {
      if (result.result && result.result !== "unrated") {
        sources.push({
          name,
          category: result.category ?? null,
          result: result.result,
        });
      }
    }
  }

  return {
    malicious: stats?.malicious ?? 0,
    suspicious: stats?.suspicious ?? 0,
    harmless: stats?.harmless ?? 0,
    undetected: stats?.undetected ?? 0,
    sources,
  };
}

async function vtFetch(
  path: string,
  init?: RequestInit,
): Promise<VtReport | null> {
  if (!env.VIRUSTOTAL_API_KEY) return null;

  const response = await fetch(`https://www.virustotal.com/api/v3${path}`, {
    ...init,
    headers: {
      "x-apikey": env.VIRUSTOTAL_API_KEY,
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VirusTotal error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as { data: Record<string, unknown> };
  return parseVtStats(json.data);
}

export function urlToVtId(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

export async function checkVtUrl(url: string): Promise<VtReport | null> {
  const id = Buffer.from(url).toString("base64url").replace(/=+$/, "");
  const report = await vtFetch(`/urls/${id}`);
  if (report) return report;

  const submit = await fetch("https://www.virustotal.com/api/v3/urls", {
    method: "POST",
    headers: {
      "x-apikey": env.VIRUSTOTAL_API_KEY!,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ url }),
  });

  if (!submit.ok) return null;

  await new Promise((resolve) => setTimeout(resolve, 2000));
  return vtFetch(`/urls/${id}`);
}

export async function checkVtDomain(domain: string): Promise<VtReport | null> {
  return vtFetch(`/domains/${encodeURIComponent(domain)}`);
}

export async function checkVtIp(ip: string): Promise<VtReport | null> {
  return vtFetch(`/ip_addresses/${encodeURIComponent(ip)}`);
}

export async function checkVtHash(hash: string): Promise<VtReport | null> {
  return vtFetch(`/files/${encodeURIComponent(hash)}`);
}
