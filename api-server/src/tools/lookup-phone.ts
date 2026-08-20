import {
  parsePhoneNumberFromString,
  type PhoneNumber,
} from "libphonenumber-js";
import { tool } from "ai";
import { z } from "zod";

export function lookupPhone(phone: string, defaultCountry?: string) {
  const parsed: PhoneNumber | undefined = parsePhoneNumberFromString(
    phone,
    defaultCountry as "US" | undefined,
  );

  if (!parsed) {
    return {
      input: phone,
      valid: false,
      formatted: null,
      country: null,
      type: null,
      e164: null,
      flags: ["invalid_format"],
    };
  }

  const flags: string[] = [];
  const type = parsed.getType() ?? "unknown";

  if (type === "TOLL_FREE") flags.push("toll_free");
  if (type === "VOIP") flags.push("voip");
  if (type === "PREMIUM_RATE") flags.push("premium_rate");

  return {
    input: phone,
    valid: parsed.isValid(),
    formatted: parsed.formatInternational(),
    country: parsed.country ?? null,
    type,
    e164: parsed.number,
    flags,
  };
}

export const lookupPhoneTool = tool({
  description:
    "Returns phone number validity, carrier type, country, and basic consistency signals.",
  inputSchema: z.object({
    phone: z.string().describe("Phone number to look up"),
    defaultCountry: z
      .string()
      .length(2)
      .optional()
      .describe("ISO 3166-1 alpha-2 country code, e.g. US"),
  }),
  execute: async ({ phone, defaultCountry }) =>
    lookupPhone(phone, defaultCountry),
});
