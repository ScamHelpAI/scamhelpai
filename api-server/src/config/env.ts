import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AI_GATEWAY_API_KEY: z.string().optional(),

  REDIS_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  VIRUSTOTAL_API_KEY: z.string().optional(),
  PHISHTANK_API_KEY: z.string().optional(),
  ABUSEIPDB_API_KEY: z.string().optional(),
  URLHAUS_AUTH_KEY: z.string().optional(),
  CHAINABUSE_API_KEY: z.string().optional(),
  ETHERSCAN_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  VIRUSTOTAL_API_KEY: process.env.VIRUSTOTAL_API_KEY,
  PHISHTANK_API_KEY: process.env.PHISHTANK_API_KEY,
  ABUSEIPDB_API_KEY: process.env.ABUSEIPDB_API_KEY,
  URLHAUS_AUTH_KEY: process.env.URLHAUS_AUTH_KEY,
  CHAINABUSE_API_KEY: process.env.CHAINABUSE_API_KEY,
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
});
