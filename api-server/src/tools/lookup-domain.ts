import { lookup, resolveNs } from "node:dns/promises";
import { whoisDomain } from "whoiser";
import { tool } from "ai";
import { z } from "zod";
import {
  domainLookupResultSchema,
  type DomainLookupResult,
} from "../schemas/tool-result.js";

export async function lookupDomain(
  domain: string,
): Promise<DomainLookupResult> {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  const [whoisResult, aRecords, nsRecords] = await Promise.allSettled([
    whoisDomain(normalized),
    lookup(normalized, { all: true }),
    resolveNs(normalized),
  ]);

  let registrar: string | undefined;
  let registeredAt: string | undefined;

  if (whoisResult.status === "fulfilled") {
    const entry = Object.values(whoisResult.value)[0] as
      Record<string, unknown> | undefined;
    if (entry) {
      registrar =
        (entry["Registrar"] as string | undefined) ??
        (entry["registrar"] as string | undefined);
      registeredAt =
        (entry["Created Date"] as string | undefined) ??
        (entry["Creation Date"] as string | undefined) ??
        (entry["created"] as string | undefined);
    }
  }

  const created = registeredAt ? new Date(registeredAt) : null;
  const ageDays =
    created && !Number.isNaN(created.getTime())
      ? Math.floor((Date.now() - created.getTime()) / 86_400_000)
      : undefined;

  const ipAddresses =
    aRecords.status === "fulfilled"
      ? aRecords.value.map((r) => r.address)
      : undefined;

  const nameservers =
    nsRecords.status === "fulfilled" ? nsRecords.value : undefined;

  const suspicious = ageDays !== undefined ? ageDays < 30 : undefined;
  const reputation =
    suspicious === true
      ? ("suspicious" as const)
      : ageDays !== undefined
        ? ("safe" as const)
        : ("unknown" as const);

  return domainLookupResultSchema.parse({
    domain: normalized,
    registeredAt,
    ageDays,
    registrar,
    nameservers,
    ipAddresses,
    suspicious,
    reputation,
  });
}

export const lookupDomainTool = tool({
  description:
    "Returns domain age, registrar, DNS records, nameservers, and whether the domain appears newly registered.",
  inputSchema: z.object({
    domain: z.string().describe("Domain name to look up, e.g. example.com"),
  }),
  execute: async ({ domain }) => lookupDomain(domain),
});
