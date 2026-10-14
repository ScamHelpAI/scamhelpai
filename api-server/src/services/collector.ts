import type {
  AnalyzeRequest,
  AnalysisInput,
} from "../schemas/analysis-input.js";
import type { Evidence, EvidenceType } from "../schemas/evidence.js";
import { checkThreatIntel } from "../tools/check-threat-intel.js";
import { inspectEmail } from "../tools/inspect-email.js";
import { inspectUrl } from "../tools/inspect-url.js";
import { lookupCryptoAddress } from "../tools/lookup-crypto-address.js";
import { lookupDomain } from "../tools/lookup-domain.js";
import { lookupPhone } from "../tools/lookup-phone.js";
import { BRAND_DOMAINS } from "../tools/shared/brands.js";
import { verifyBrandIdentity } from "../tools/verify-brand-identity.js";
import { createSequentialId } from "./ids.js";

const URL_RE = /https?:\/\/[^\s"'<>]+/gi;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const BTC_RE = /\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}\b/g;
const ETH_RE = /\b0x[a-fA-F0-9]{40}\b/g;

const MAX_URLS = 10;
const MAX_DOMAINS = 5;
const MAX_PHONES = 3;
const MAX_CRYPTO = 3;
const MAX_BRANDS = 3;

export type CollectorState = {
  inputs: Array<{ id: string; type: string; text: string }>;
  context?: AnalyzeRequest["context"];
  indicators: {
    urls: string[];
    domains: string[];
    emails: string[];
    phones: string[];
    crypto: string[];
    brands: string[];
  };
  evidenceSummaries: Array<{ id: string; summary: string; confidence: number }>;
};

function inputId(index: number): string {
  return `input-${index + 1}`;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function truncate(text: string, max = 4000): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function extractTextFromInput(input: AnalysisInput): string {
  switch (input.type) {
    case "text":
      return input.content;
    case "url":
      return input.url;
    case "email":
      return [input.raw, input.body, JSON.stringify(input.headers ?? {})]
        .filter(Boolean)
        .join("\n");
    case "image":
    case "audio":
    case "pdf":
      return "";
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function extractBrands(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const brand of Object.keys(BRAND_DOMAINS)) {
    if (lower.includes(brand)) {
      found.push(brand);
    }
  }
  return found;
}

function extractIndicators(text: string, urlInput?: string): CollectorState["indicators"] {
  const urls = unique([
    ...(urlInput ? [urlInput] : []),
    ...(text.match(URL_RE) ?? []),
  ]).slice(0, MAX_URLS);

  const domains = unique(
    urls
      .map(hostnameFromUrl)
      .filter((value): value is string => value !== null),
  ).slice(0, MAX_DOMAINS);

  return {
    urls,
    domains,
    emails: unique(text.match(EMAIL_RE) ?? []).slice(0, MAX_URLS),
    phones: unique(text.match(PHONE_RE) ?? []).slice(0, MAX_PHONES),
    crypto: unique([
      ...(text.match(BTC_RE) ?? []),
      ...(text.match(ETH_RE) ?? []),
    ]).slice(0, MAX_CRYPTO),
    brands: extractBrands(text).slice(0, MAX_BRANDS),
  };
}

function mergeIndicators(
  left: CollectorState["indicators"],
  right: CollectorState["indicators"],
): CollectorState["indicators"] {
  return {
    urls: unique([...left.urls, ...right.urls]).slice(0, MAX_URLS),
    domains: unique([...left.domains, ...right.domains]).slice(0, MAX_DOMAINS),
    emails: unique([...left.emails, ...right.emails]).slice(0, MAX_URLS),
    phones: unique([...left.phones, ...right.phones]).slice(0, MAX_PHONES),
    crypto: unique([...left.crypto, ...right.crypto]).slice(0, MAX_CRYPTO),
    brands: unique([...left.brands, ...right.brands]).slice(0, MAX_BRANDS),
  };
}

function createEvidence(params: {
  id: string;
  type: EvidenceType;
  source: Evidence["source"];
  summary: string;
  confidence: number;
  toolName?: string;
  sourceInputId?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}): Evidence {
  return {
    id: params.id,
    type: params.type,
    source: params.source,
    summary: params.summary,
    confidence: params.confidence,
    toolName: params.toolName,
    sourceInputId: params.sourceInputId,
    data: params.data,
    createdAt: params.createdAt,
  };
}

function summarizeUrlInspection(
  result: Awaited<ReturnType<typeof inspectUrl>>,
): string {
  const features = result.suspiciousFeatures.join(", ");
  const https = result.usesHttps ? "uses HTTPS" : "does not use HTTPS";
  const form = result.credentialFormDetected
    ? "credential form detected"
    : "no credential form detected";
  return `URL ${result.normalizedUrl} ${https}; ${form}${features ? `; suspicious features: ${features}` : ""}`;
}

function summarizeDomainLookup(
  result: Awaited<ReturnType<typeof lookupDomain>>,
): string {
  const age =
    result.ageDays !== undefined
      ? `registered about ${result.ageDays} days ago`
      : "registration age unknown";
  const reputation = result.reputation ?? "unknown";
  return `Domain ${result.domain} ${age}; reputation ${reputation}`;
}

function summarizeThreatIntel(
  result: Awaited<ReturnType<typeof checkThreatIntel>>,
): string {
  const sources = result.sources
    .filter((source) => source.verdict === "malicious")
    .map((source) => source.name);
  const sourceText =
    sources.length > 0
      ? `flagged by ${sources.join(", ")}`
      : "no malicious source hits";
  return `Threat intel for ${result.indicator} is ${result.verdict}; ${sourceText}`;
}

async function investigateIndicators(
  indicators: CollectorState["indicators"],
  createdAt: string,
  nextId: () => string,
): Promise<Evidence[]> {
  const evidences: Evidence[] = [];

  const tasks: Array<Promise<void>> = [];

  for (const url of indicators.urls) {
    tasks.push(
      inspectUrl(url).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "url",
            source: "tool",
            summary: summarizeUrlInspection(result),
            confidence: 0.85,
            toolName: "inspect_url",
            data: { url: result.normalizedUrl },
            createdAt,
          }),
        );
      }),
    );
    tasks.push(
      checkThreatIntel(url).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "threat_intel",
            source: "tool",
            summary: summarizeThreatIntel(result),
            confidence: result.verdict === "malicious" ? 0.9 : 0.75,
            toolName: "check_threat_intel",
            data: { indicator: result.indicator, verdict: result.verdict },
            createdAt,
          }),
        );
      }),
    );
  }

  for (const domain of indicators.domains) {
    tasks.push(
      lookupDomain(domain).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "domain",
            source: "tool",
            summary: summarizeDomainLookup(result),
            confidence: 0.8,
            toolName: "lookup_domain",
            data: { domain: result.domain },
            createdAt,
          }),
        );
      }),
    );
    tasks.push(
      checkThreatIntel(domain).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "threat_intel",
            source: "tool",
            summary: summarizeThreatIntel(result),
            confidence: result.verdict === "malicious" ? 0.9 : 0.75,
            toolName: "check_threat_intel",
            data: { indicator: result.indicator, verdict: result.verdict },
            createdAt,
          }),
        );
      }),
    );
  }

  for (const phone of indicators.phones) {
    tasks.push(
      Promise.resolve(lookupPhone(phone)).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "external",
            source: "tool",
            summary: `Phone ${result.input} is ${result.valid ? "valid" : "invalid"}${result.flags.length ? `; flags: ${result.flags.join(", ")}` : ""}`,
            confidence: 0.7,
            toolName: "lookup_phone",
            data: { phone: result.input },
            createdAt,
          }),
        );
      }),
    );
  }

  for (const address of indicators.crypto) {
    tasks.push(
      lookupCryptoAddress(address).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "external",
            source: "tool",
            summary: `Crypto address ${result.address} on ${result.chain}${result.reportedScam ? " has abuse reports" : " has no known abuse reports"}`,
            confidence: result.reportedScam ? 0.85 : 0.7,
            toolName: "lookup_crypto_address",
            data: { address: result.address },
            createdAt,
          }),
        );
      }),
    );
  }

  for (const brand of indicators.brands) {
    const domain = indicators.domains[0];
    if (!domain) continue;
    tasks.push(
      verifyBrandIdentity(brand, domain).then((result) => {
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "identity",
            source: "tool",
            summary: `Brand check for ${brand} on ${domain}: ${result.likelyLegitimate ? "likely legitimate" : "likely impersonation"}`,
            confidence: result.likelyLegitimate ? 0.8 : 0.85,
            toolName: "verify_brand_identity",
            data: { brand, domain },
            createdAt,
          }),
        );
      }),
    );
  }

  await Promise.allSettled(tasks);
  return evidences;
}

const EMPTY_INDICATORS: CollectorState["indicators"] = {
  urls: [],
  domains: [],
  emails: [],
  phones: [],
  crypto: [],
  brands: [],
};

export function buildCollectorState(
  request: AnalyzeRequest,
  evidences: Evidence[],
): CollectorState {
  const inputs = request.inputs.map((input, index) => ({
    id: inputId(index),
    type: input.type,
    text: truncate(extractTextFromInput(input)),
  }));

  return {
    inputs,
    context: request.context,
    indicators: request.inputs.reduce<CollectorState["indicators"]>(
      (acc, input) =>
        mergeIndicators(
          acc,
          extractIndicators(
            extractTextFromInput(input),
            input.type === "url" ? input.url : undefined,
          ),
        ),
      EMPTY_INDICATORS,
    ),
    evidenceSummaries: evidences.map((item) => ({
      id: item.id,
      summary: item.summary,
      confidence: item.confidence,
    })),
  };
}

export async function collect(request: AnalyzeRequest): Promise<Evidence[]> {
  const createdAt = new Date().toISOString();
  const evidences: Evidence[] = [];
  const nextId = createSequentialId("ev");

  let indicators = {
    urls: [] as string[],
    domains: [] as string[],
    emails: [] as string[],
    phones: [] as string[],
    crypto: [] as string[],
    brands: [] as string[],
  };

  for (const [index, input] of request.inputs.entries()) {
    const sourceInputId = inputId(index);
    const text = extractTextFromInput(input);
    indicators = mergeIndicators(
      indicators,
      extractIndicators(text, input.type === "url" ? input.url : undefined),
    );

    if (text.trim()) {
      evidences.push(
        createEvidence({
          id: nextId(),
          type: "text",
          source: "user_input",
          summary: `Submission includes ${input.type} content (${text.length} characters)`,
          confidence: 1,
          sourceInputId,
          createdAt,
        }),
      );
    }

    if (input.type === "email" && (input.raw || input.body)) {
      try {
        const emailResult = await inspectEmail(
          input.headers
            ? Object.entries(input.headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n")
            : "",
          input.body ?? input.raw ?? "",
        );
        evidences.push(
          createEvidence({
            id: nextId(),
            type: "email",
            source: "tool",
            summary: `Email from ${emailResult.from}${emailResult.flags.length ? `; flags: ${emailResult.flags.join(", ")}` : ""}`,
            confidence: 0.85,
            toolName: "inspect_email",
            sourceInputId,
            data: {
              from: emailResult.from,
              flags: emailResult.flags,
              urlCount: emailResult.urls.length,
            },
            createdAt,
          }),
        );
        indicators = mergeIndicators(
          indicators,
          extractIndicators(emailResult.urls.join(" ")),
        );
      } catch {
        // Email parsing can fail on partial input; user_input evidence still remains.
      }
    }
  }

  const toolEvidences = await investigateIndicators(
    indicators,
    createdAt,
    nextId,
  );
  evidences.push(...toolEvidences);

  return evidences;
}

