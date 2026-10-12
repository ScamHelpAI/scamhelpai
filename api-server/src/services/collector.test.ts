import { describe, expect, it, vi } from "vitest";

vi.mock("../tools/inspect-url.js", () => ({
  inspectUrl: vi.fn(async (url: string) => ({
    originalUrl: url,
    normalizedUrl: url,
    redirectChain: [],
    hostname: "example.com",
    usesHttps: true,
    suspiciousFeatures: [],
  })),
}));

vi.mock("../tools/check-threat-intel.js", () => ({
  checkThreatIntel: vi.fn(async (indicator: string) => ({
    indicator,
    type: indicator.startsWith("http") ? "url" : "domain",
    verdict: "unknown",
    sources: [],
  })),
}));

vi.mock("../tools/lookup-domain.js", () => ({
  lookupDomain: vi.fn(async (domain: string) => ({
    domain,
    ageDays: 365,
    reputation: "unknown",
  })),
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

import { collect } from "./collector.js";

describe("collect", () => {
  it("assigns unique evidence ids when user input and tool findings are both present", async () => {
    const evidences = await collect({
      inputs: [{ type: "url", url: "https://example.com/login" }],
    });

    const ids = evidences.map((item) => item.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
