import { checkThreatIntel } from "./check-threat-intel.js";
import { inspectEmail } from "./inspect-email.js";
import { inspectUrl } from "./inspect-url.js";
import { lookupDomain } from "./lookup-domain.js";
import { verifyBrandIdentity } from "./verify-brand-identity.js";
import { webVerify } from "./web-verify.js";
import { tool } from "ai";
import { z } from "zod";

const evidenceTypeSchema = z.enum([
  "url",
  "domain",
  "threat_intel",
  "brand",
  "email",
  "web_claim",
]);

export async function verifyEvidence(input: {
  type: z.infer<typeof evidenceTypeSchema>;
  value: string;
  brandName?: string;
  emailHeaders?: string;
  emailBody?: string;
}) {
  const { type, value, brandName, emailHeaders, emailBody } = input;

  switch (type) {
    case "url":
      return { type, verified: await inspectUrl(value) };
    case "domain":
      return { type, verified: await lookupDomain(value) };
    case "threat_intel":
      return { type, verified: await checkThreatIntel(value) };
    case "brand":
      if (!brandName) {
        throw new Error("brandName is required for brand evidence verification");
      }
      return { type, verified: await verifyBrandIdentity(brandName, value) };
    case "email":
      if (!emailHeaders || !emailBody) {
        throw new Error(
          "emailHeaders and emailBody are required for email evidence verification",
        );
      }
      return { type, verified: await inspectEmail(emailHeaders, emailBody) };
    case "web_claim":
      return { type, verified: await webVerify(value) };
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unsupported evidence type: ${_exhaustive}`);
    }
  }
}

export const verifyEvidenceTool = tool({
  description:
    "Re-verifies a specific piece of scanner evidence by re-running the relevant deterministic check.",
  inputSchema: z.object({
    type: evidenceTypeSchema.describe("Kind of evidence to verify"),
    value: z
      .string()
      .describe("Primary value: URL, domain, indicator, domain for brand check, or web claim query"),
    brandName: z
      .string()
      .optional()
      .describe("Required when type is brand"),
    emailHeaders: z
      .string()
      .optional()
      .describe("Required when type is email"),
    emailBody: z
      .string()
      .optional()
      .describe("Required when type is email"),
  }),
  execute: async (input) => verifyEvidence(input),
});
