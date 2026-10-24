/**
 * Phone indicator extraction should not treat arbitrary long digit strings as phones.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../tools/inspect-url.js", () => ({
  inspectUrl: vi.fn(),
}));
vi.mock("../tools/check-threat-intel.js", () => ({
  checkThreatIntel: vi.fn(),
}));
vi.mock("../tools/lookup-domain.js", () => ({
  lookupDomain: vi.fn(),
}));
vi.mock("../tools/lookup-crypto-address.js", () => ({
  lookupCryptoAddress: vi.fn(),
}));
vi.mock("../tools/lookup-phone.js", () => ({
  lookupPhone: vi.fn((phone: string) => ({
    input: phone,
    valid: true,
    flags: [],
  })),
}));
vi.mock("../tools/verify-brand-identity.js", () => ({
  verifyBrandIdentity: vi.fn(),
}));
vi.mock("../tools/inspect-email.js", () => ({
  inspectEmail: vi.fn(),
}));

import { collect } from "../services/analyze/collector.js";

describe("collect phone indicators", () => {
  it("does not emit phone evidence for long digit false positives", async () => {
    const evidences = await collect({
      inputs: [
        {
          type: "text",
          content:
            "Your reference 9359873056908 is pending. Call (555) 123-4567 if you need help.",
        },
      ],
    });

    const phoneEvidence = evidences.filter(
      (item) => item.toolName === "lookup_phone",
    );
    expect(
      phoneEvidence.some((item) => item.summary.includes("9359873056908")),
    ).toBe(false);
    expect(phoneEvidence.some((item) => item.summary.includes("555"))).toBe(
      true,
    );
  });
});
