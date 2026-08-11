import type { AnalyzerResult } from "../types/analyze.js";

const SUSPICIOUS_TLDS = new Set([
  "xyz",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "top",
  "club",
  "work",
  "click",
  "link",
  "icu",
  "rest",
  "country",
  "zip",
  "mov",
]);

const BRANDS: Array<{ name: string; domains: string[] }> = [
  {
    name: "Microsoft",
    domains: ["microsoft.com", "live.com", "office.com", "outlook.com", "microsoftonline.com"],
  },
  {
    name: "Apple",
    domains: ["apple.com", "icloud.com", "appleid.apple.com"],
  },
  {
    name: "Google",
    domains: ["google.com", "gmail.com", "youtube.com", "googleapis.com"],
  },
  {
    name: "Amazon",
    domains: ["amazon.com", "aws.amazon.com", "amazon.co.uk"],
  },
  {
    name: "PayPal",
    domains: ["paypal.com"],
  },
  {
    name: "Netflix",
    domains: ["netflix.com"],
  },
  {
    name: "Bank of America",
    domains: ["bankofamerica.com"],
  },
];

const SUSPICIOUS_QUERY_KEYS = [
  "password",
  "passwd",
  "token",
  "verify",
  "login",
  "signin",
  "account",
  "session",
  "redirect",
  "return_url",
  "next",
];

function hostnameLooksLikeIp(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function registrableHint(hostname: string): string {
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return hostname.toLowerCase();
  return parts.slice(-2).join(".");
}

function isOfficialBrandDomain(hostname: string, domains: string[]): boolean {
  const host = hostname.toLowerCase();
  return domains.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
}

export function analyzeUrl(
  urlString: string,
  claimedBrandText?: string,
): AnalyzerResult {
  const findings: AnalyzerResult["findings"] = [];

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    findings.push({
      id: "url-invalid",
      weight: 25,
      reason: "The URL could not be parsed.",
      category: "unknown",
    });
    return { findings };
  }

  const hostname = url.hostname.toLowerCase();
  const tld = hostname.split(".").pop() ?? "";

  if (url.protocol === "http:") {
    findings.push({
      id: "url-http",
      weight: 10,
      reason: "The page is served over HTTP instead of HTTPS.",
    });
  }

  if (hostname.includes("xn--")) {
    findings.push({
      id: "url-punycode",
      weight: 25,
      reason: "The domain uses punycode, which can hide lookalike characters.",
      category: "phishing",
    });
  }

  if (hostnameLooksLikeIp(hostname)) {
    findings.push({
      id: "url-ip",
      weight: 30,
      reason: "The URL uses an IP address instead of a normal domain name.",
      category: "phishing",
    });
  }

  if (SUSPICIOUS_TLDS.has(tld)) {
    findings.push({
      id: "url-suspicious-tld",
      weight: 15,
      reason: `The domain uses a frequently abused TLD (.${tld}).`,
      category: "phishing",
    });
  }

  const labels = hostname.split(".").filter(Boolean);
  if (labels.length >= 4) {
    findings.push({
      id: "url-excess-subdomains",
      weight: 15,
      reason: "The URL has an unusual number of subdomains.",
      category: "phishing",
    });
  }

  for (const key of url.searchParams.keys()) {
    if (SUSPICIOUS_QUERY_KEYS.includes(key.toLowerCase())) {
      findings.push({
        id: "url-suspicious-query",
        weight: 10,
        reason: "The URL includes suspicious query parameters.",
        category: "phishing",
      });
      break;
    }
  }

  const haystack = `${claimedBrandText ?? ""} ${hostname}`.toLowerCase();
  for (const brand of BRANDS) {
    const brandMentioned =
      haystack.includes(brand.name.toLowerCase()) ||
      hostname.includes(brand.name.toLowerCase().replace(/\s+/g, ""));
    if (!brandMentioned) continue;

    if (!isOfficialBrandDomain(hostname, brand.domains)) {
      findings.push({
        id: `url-brand-mismatch-${brand.name.toLowerCase().replace(/\s+/g, "-")}`,
        weight: 30,
        reason: `The page appears to reference ${brand.name}, but the domain is not an official ${brand.name} domain (${registrableHint(hostname)}).`,
        category: "phishing",
      });
    }
  }

  return { findings };
}

export { BRANDS, isOfficialBrandDomain };
