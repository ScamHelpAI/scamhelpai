/**
 * Lightweight URL check endpoint logic: inspect a URL, look up its domain and
 * threat intel, then score a simple safe/suspicious/malicious status.
 */
import { checkThreatIntel } from "../../tools/check-threat-intel.js";
import { inspectUrl } from "../../tools/inspect-url.js";
import { lookupDomain } from "../../tools/lookup-domain.js";
import type { CheckUrlResult, CheckStatus } from "../../schemas/check.js";
import type { DomainLookupResult } from "../../schemas/tool-result.js";
import type { ThreatIntelResult } from "../../schemas/tool-result.js";
import type { UrlInspectionResult } from "../../schemas/tool-result.js";
import {
  getCachedCheckUrl,
  storeCheckUrlResult,
} from "./check-cache.js";
import { normalizeCheckUrl, hostnameFromCheckUrl } from "./check-cache-key.js";
import type { DomainCacheEntry } from "./check-cache-policy.js";

function scoreCheck(params: {
  threatIntel: ThreatIntelResult;
  inspection: UrlInspectionResult;
  domain: DomainLookupResult;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (params.threatIntel.verdict === "malicious") {
    score += 70;
    reasons.push("Flagged as malicious by threat intelligence.");
  } else if (params.threatIntel.verdict === "suspicious") {
    score += 40;
    reasons.push("Marked suspicious by threat intelligence.");
  }

  for (const source of params.threatIntel.sources) {
    if (source.verdict === "malicious") {
      reasons.push(`${source.name} reports this indicator as malicious.`);
    }
  }

  if (params.domain.suspicious) {
    score += 25;
    reasons.push("Domain appears newly registered.");
  } else if (params.domain.reputation === "suspicious") {
    score += 20;
    reasons.push("Domain reputation is suspicious.");
  }

  if (params.inspection.suspiciousFeatures.length > 0) {
    score += Math.min(30, params.inspection.suspiciousFeatures.length * 10);
    reasons.push(
      `Suspicious URL features: ${params.inspection.suspiciousFeatures.join(", ")}.`,
    );
  }

  if (!params.inspection.usesHttps) {
    score += 10;
    reasons.push("URL does not use HTTPS.");
  }

  return {
    score: Math.min(100, score),
    reasons: [...new Set(reasons)],
  };
}

function statusFromScore(score: number): CheckStatus {
  if (score >= 70) return "danger";
  if (score >= 35) return "warning";
  return "safe";
}

function defaultReasons(status: CheckStatus): string[] {
  switch (status) {
    case "safe":
      return ["No significant risk signals detected."];
    case "warning":
      return ["Some risk signals were detected."];
    case "danger":
      return ["Strong risk signals were detected."];
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function buildDomainCacheEntry(params: {
  hostname: string;
  threatIntel: ThreatIntelResult;
  domain: DomainLookupResult;
  checkedAt: string;
}): DomainCacheEntry {
  let score = 0;
  const reasons: string[] = [];

  if (params.threatIntel.verdict === "malicious") {
    score += 70;
    reasons.push("Flagged as malicious by threat intelligence.");
  } else if (params.threatIntel.verdict === "suspicious") {
    score += 40;
    reasons.push("Marked suspicious by threat intelligence.");
  }

  if (params.domain.suspicious) {
    score += 25;
    reasons.push("Domain appears newly registered.");
  } else if (params.domain.reputation === "suspicious") {
    score += 20;
    reasons.push("Domain reputation is suspicious.");
  }

  const normalizedScore = Math.min(100, score);
  const status = statusFromScore(normalizedScore);

  return {
    hostname: params.hostname,
    status,
    score: normalizedScore,
    reasons:
      reasons.length > 0 ? [...new Set(reasons)] : defaultReasons(status),
    checkedAt: params.checkedAt,
  };
}

async function runLiveUrlCheck(normalizedUrl: string): Promise<CheckUrlResult> {
  const hostname = hostnameFromCheckUrl(normalizedUrl);
  const checkedAt = new Date().toISOString();

  const [threatIntel, inspection, domainLookup] = await Promise.all([
    checkThreatIntel(normalizedUrl),
    inspectUrl(normalizedUrl),
    lookupDomain(hostname),
  ]);

  const { score, reasons } = scoreCheck({
    threatIntel,
    inspection,
    domain: domainLookup,
  });
  const status = statusFromScore(score);

  const result: Omit<CheckUrlResult, "cached"> = {
    url: normalizedUrl,
    status,
    score,
    reasons: reasons.length > 0 ? reasons : defaultReasons(status),
    checkedAt,
  };

  const domainEntry = buildDomainCacheEntry({
    hostname,
    threatIntel,
    domain: domainLookup,
    checkedAt,
  });

  return storeCheckUrlResult({
    normalizedUrl,
    result,
    domainEntry,
  });
}

export async function checkUrl(url: string): Promise<CheckUrlResult> {
  const normalizedUrl = normalizeCheckUrl(url);

  const cached = await getCachedCheckUrl(normalizedUrl);
  if (cached) {
    return cached;
  }

  return runLiveUrlCheck(normalizedUrl);
}

export async function checkUrls(urls: string[]): Promise<CheckUrlResult[]> {
  const uniqueUrls = [
    ...new Set(urls.map((url) => normalizeCheckUrl(url))),
  ];
  return Promise.all(uniqueUrls.map((url) => checkUrl(url)));
}
