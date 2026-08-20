import { env } from "../config/env.js";
import { tool } from "ai";
import { z } from "zod";

type CryptoChain = "bitcoin" | "ethereum" | "unknown";

const BTC_RE = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const ETH_RE = /^0x[a-fA-F0-9]{40}$/;

function detectChain(address: string): CryptoChain {
  if (BTC_RE.test(address)) return "bitcoin";
  if (ETH_RE.test(address)) return "ethereum";
  return "unknown";
}

async function checkChainabuse(address: string) {
  if (!env.CHAINABUSE_API_KEY) return null;

  const response = await fetch(
    `https://api.chainabuse.com/v0/reports?address=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.CHAINABUSE_API_KEY}:`).toString("base64")}`,
      },
    },
  );

  if (!response.ok) return null;

  const json = (await response.json()) as { count?: number; reports?: unknown[] };
  return {
    reportCount: json.count ?? json.reports?.length ?? 0,
    reported: (json.count ?? json.reports?.length ?? 0) > 0,
  };
}

async function checkEtherscanLabels(address: string) {
  if (!env.ETHERSCAN_API_KEY || !ETH_RE.test(address)) return null;

  const response = await fetch(
    `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${env.ETHERSCAN_API_KEY}`,
  );

  if (!response.ok) return null;

  const json = (await response.json()) as { status: string; message: string };
  return {
    reachable: json.status === "1",
    note: json.message,
  };
}

export async function lookupCryptoAddress(address: string) {
  const trimmed = address.trim();
  const chain = detectChain(trimmed);
  const valid = chain !== "unknown";

  const [chainabuse, etherscan] = await Promise.all([
    checkChainabuse(trimmed),
    checkEtherscanLabels(trimmed),
  ]);

  return {
    address: trimmed,
    chain,
    valid,
    reportedScam: chainabuse?.reported ?? false,
    reportCount: chainabuse?.reportCount ?? null,
    etherscan: etherscan,
  };
}

export const lookupCryptoAddressTool = tool({
  description:
    "Returns blockchain type, address validity, and known scam report flags.",
  inputSchema: z.object({
    address: z.string().describe("Cryptocurrency wallet address to check"),
  }),
  execute: async ({ address }) => lookupCryptoAddress(address),
});
