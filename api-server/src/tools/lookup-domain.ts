import { lookup, resolveMx, resolveNs, resolveTxt } from "node:dns/promises";
import { whoisDomain } from "whoiser";
import { tool } from "ai";
import { z } from "zod";

export async function lookupDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  const [whoisResult, aRecords, mxRecords, nsRecords, txtRecords] =
    await Promise.allSettled([
      whoisDomain(normalized),
      lookup(normalized, { all: true }),
      resolveMx(normalized),
      resolveNs(normalized),
      resolveTxt(normalized),
    ]);

  let registrar: string | undefined;
  let creationDate: string | undefined;
  let updatedDate: string | undefined;

  if (whoisResult.status === "fulfilled") {
    const entry = Object.values(whoisResult.value)[0] as
      | Record<string, unknown>
      | undefined;
    if (entry) {
      registrar =
        (entry["Registrar"] as string | undefined) ??
        (entry["registrar"] as string | undefined);
      creationDate =
        (entry["Created Date"] as string | undefined) ??
        (entry["Creation Date"] as string | undefined) ??
        (entry["created"] as string | undefined);
      updatedDate =
        (entry["Updated Date"] as string | undefined) ??
        (entry["updated"] as string | undefined);
    }
  }

  const created = creationDate ? new Date(creationDate) : null;
  const ageDays =
    created && !Number.isNaN(created.getTime())
      ? Math.floor((Date.now() - created.getTime()) / 86_400_000)
      : null;

  return {
    domain: normalized,
    registrar: registrar ?? null,
    creationDate: creationDate ?? null,
    updatedDate: updatedDate ?? null,
    ageDays,
    newlyRegistered: ageDays !== null ? ageDays < 30 : null,
    dns: {
      a:
        aRecords.status === "fulfilled"
          ? aRecords.value.map((r) => r.address)
          : [],
      mx:
        mxRecords.status === "fulfilled"
          ? mxRecords.value.map((r) => ({ exchange: r.exchange, priority: r.priority }))
          : [],
      ns: nsRecords.status === "fulfilled" ? nsRecords.value : [],
      txt:
        txtRecords.status === "fulfilled"
          ? txtRecords.value.map((records) => records.join(""))
          : [],
    },
  };
}

export const lookupDomainTool = tool({
  description:
    "Returns domain age, registrar, DNS records, nameservers, and whether the domain appears newly registered.",
  inputSchema: z.object({
    domain: z.string().describe("Domain name to look up, e.g. example.com"),
  }),
  execute: async ({ domain }) => lookupDomain(domain),
});
