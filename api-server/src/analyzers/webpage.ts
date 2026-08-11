import { BRANDS, isOfficialBrandDomain } from "./url.js";
import type { AnalyzerResult, FormInfo } from "../types/analyze.js";

type WebpageInput = {
  url: string;
  text?: string;
  pageTitle?: string;
  forms?: FormInfo[];
};

function tryHostname(urlString: string): string | null {
  try {
    return new URL(urlString).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function analyzeWebpage(input: WebpageInput): AnalyzerResult {
  const findings: AnalyzerResult["findings"] = [];
  const pageHost = tryHostname(input.url);
  const forms = input.forms ?? [];
  const visibleText = `${input.pageTitle ?? ""}\n${input.text ?? ""}`.toLowerCase();

  const allInputs = forms.flatMap((f) =>
    (f.inputs ?? []).map((i) => i.toLowerCase()),
  );

  const asksPassword = allInputs.some((i) =>
    /password|passwd|pwd/.test(i),
  );
  const asksPayment = allInputs.some((i) =>
    /card|cvv|cc-|credit|billing|iban|routing/.test(i),
  );
  const asksCredentials = asksPassword ||
    allInputs.some((i) => /email|username|user|login/.test(i));

  if (asksPassword) {
    findings.push({
      id: "page-password-field",
      weight: 20,
      reason: "The page requests account credentials.",
      category: "phishing",
    });
  } else if (asksCredentials) {
    findings.push({
      id: "page-login-fields",
      weight: 12,
      reason: "The page includes login-related form fields.",
      category: "phishing",
    });
  }

  if (asksPayment) {
    findings.push({
      id: "page-payment-fields",
      weight: 20,
      reason: "The page asks for payment or card details.",
      category: "phishing",
    });
  }

  for (const form of forms) {
    if (!form.action || !pageHost) continue;
    const actionHost = tryHostname(form.action);
    if (!actionHost) continue;
    if (actionHost !== pageHost && !actionHost.endsWith(`.${pageHost}`) && !pageHost.endsWith(`.${actionHost}`)) {
      findings.push({
        id: "page-external-form",
        weight: 25,
        reason: "A form submits to a different domain than the page itself.",
        category: "phishing",
      });
      break;
    }
  }

  for (const brand of BRANDS) {
    const mentioned =
      visibleText.includes(brand.name.toLowerCase()) ||
      (input.pageTitle ?? "").toLowerCase().includes(brand.name.toLowerCase());
    if (!mentioned || !pageHost) continue;

    if (!isOfficialBrandDomain(pageHost, brand.domains)) {
      findings.push({
        id: `page-brand-mismatch-${brand.name.toLowerCase().replace(/\s+/g, "-")}`,
        weight: 30,
        reason: `The page appears to impersonate ${brand.name}.`,
        category: "phishing",
      });
      findings.push({
        id: `page-official-domain-${brand.name.toLowerCase().replace(/\s+/g, "-")}`,
        weight: 0,
        reason: `The domain is not an official ${brand.name} domain.`,
        category: "phishing",
      });
    }
  }

  return { findings };
}
