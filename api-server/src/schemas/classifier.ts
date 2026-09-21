import { z } from "zod";
import type { ScamType } from "./analyst.js";

export const SCAM_TYPE_CRITERIA: Record<ScamType, string> = {
  credential_phishing:
    "Asks for passwords, MFA codes, or login on a lookalike or unofficial site",
  impersonation:
    "Pretends to be a company, government agency, or person the recipient should trust",
  tech_support:
    "Claims device problems, remote access needs, or fake security alerts",
  investment:
    "Promises guaranteed returns, trading tips, or pump-and-dump schemes",
  romance:
    "Builds emotional trust to solicit money, gifts, or crypto transfers",
  job:
    "Fake hiring, upfront fees, or check-cashing employment offers",
  invoice:
    "Unexpected invoice, payment link, or billing document from an unknown sender",
  payment:
    "Demands immediate payment, wire transfer, gift cards, or Zelle/Venmo",
  crypto:
    "Requests cryptocurrency transfer, wallet seed phrase, or blockchain payment",
  account_takeover:
    "Claims account lock, suspicious activity, or urges credential reset",
  malware:
    "Delivers malicious attachment, download link, or drive-by install",
  other: "Fraud pattern that does not fit the other categories",
  unknown: "Indicators are too thin or ambiguous to classify",
};

export const RISK_RUBRIC = [
  "Low risk: no meaningful scam indicators or clearly benign transactional content",
  "Medium risk: some pressure or odd contact details but no confirmed malicious infrastructure",
  "High risk: corroborated impersonation, payment redirection, or threat-intel hits",
  "Critical risk: confirmed credential capture, malware, or multiple independent malicious signals",
] as const;

export const classifierBooleanQuestions = [
  "impersonation",
  "credential_harvest",
  "payment_redirection",
  "malware_delivery",
  "urgency_manipulation",
  "insufficient_evidence",
] as const;

export type ClassifierBooleanQuestion =
  (typeof classifierBooleanQuestions)[number];

export const classifierResultSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  providerConfidence: z.record(z.string(), z.number()).optional(),
  modelId: z.string().optional(),
});

export type ClassifierResult = z.infer<typeof classifierResultSchema>;
