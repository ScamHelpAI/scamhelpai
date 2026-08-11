import type { AnalyzerResult } from "../types/analyze.js";

type Pattern = {
  id: string;
  weight: number;
  reason: string;
  test: RegExp;
};

const PATTERNS: Pattern[] = [
  {
    id: "text-urgency",
    weight: 12,
    reason: "The message uses urgent account-suspension or deadline language.",
    test: /\b(urgent|immediately|act now|within \d+ hours?|final notice|account will be (suspended|closed|locked)|suspended|expire[sd]?)\b/i,
  },
  {
    id: "text-threat",
    weight: 12,
    reason: "The message threatens legal action, arrest, or account loss.",
    test: /\b(arrest|lawsuit|legal action|police|warrant|prosecut|will be locked|permanent(?:ly)? (?:delet|clos|ban))/i,
  },
  {
    id: "text-gift-card",
    weight: 25,
    reason: "The message asks for gift cards, a common scam payment method.",
    test: /\b(gift\s*cards?|itunes card|steam card|google play card|apple card)\b/i,
  },
  {
    id: "text-crypto",
    weight: 20,
    reason: "The message requests cryptocurrency payment.",
    test: /\b(bitcoin|btc|ethereum|eth|crypto(?:currency)?|wallet address|usdt|wire to wallet)\b/i,
  },
  {
    id: "text-unexpected-payment",
    weight: 15,
    reason: "The message asks for an unexpected payment or fee.",
    test: /\b(pay (?:now|immediately|a fee)|wire transfer|western union|moneygram|send (?:money|payment)|processing fee|refund fee)\b/i,
  },
  {
    id: "text-verification-code",
    weight: 15,
    reason: "The message asks you to share a verification or security code.",
    test: /\b((verification|security|auth(?:entication)?|2fa|one[- ]time) codes?|otp|send (?:me )?the code)\b/i,
  },
  {
    id: "text-account-suspension",
    weight: 12,
    reason: "The message claims an account has been or will be suspended.",
    test: /\b(account (?:has been |will be )?(?:suspend|lock|compromis|disable)|unusual (?:sign[- ]?in|activity)|verify your (?:account|identity))\b/i,
  },
  {
    id: "text-package",
    weight: 10,
    reason: "The message uses a fake package-delivery theme.",
    test: /\b(package (?:held|pending|delivery)|delivery attempt|customs fee|shipping fee|track your (?:package|parcel))\b/i,
  },
  {
    id: "text-sensitive-info",
    weight: 18,
    reason: "The message requests sensitive personal or financial information.",
    test: /\b(ssn|social security|password|pin\b|cvv|card number|bank (?:account|routing)|mother'?s maiden|date of birth|full ssn)\b/i,
  },
];

export function analyzeText(text: string): AnalyzerResult {
  const findings: AnalyzerResult["findings"] = [];
  if (!text.trim()) return { findings };

  for (const pattern of PATTERNS) {
    if (pattern.test.test(text)) {
      findings.push({
        id: pattern.id,
        weight: pattern.weight,
        reason: pattern.reason,
        category: "social_engineering",
      });
    }
  }

  return { findings };
}
