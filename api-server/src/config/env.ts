import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  VIRUSTOTAL_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  PHISHTANK_API_KEY: z.string().optional(),
  ABUSEIPDB_API_KEY: z.string().optional(),
  URLHAUS_AUTH_KEY: z.string().optional(),
  CHAINABUSE_API_KEY: z.string().optional(),
  ETHERSCAN_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  VIRUSTOTAL_API_KEY: process.env.VIRUSTOTAL_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  PHISHTANK_API_KEY: process.env.PHISHTANK_API_KEY,
  ABUSEIPDB_API_KEY: process.env.ABUSEIPDB_API_KEY,
  URLHAUS_AUTH_KEY: process.env.URLHAUS_AUTH_KEY,
  CHAINABUSE_API_KEY: process.env.CHAINABUSE_API_KEY,
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  SERPER_API_KEY: process.env.SERPER_API_KEY,
});
