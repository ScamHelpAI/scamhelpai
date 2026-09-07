import { z } from "zod";

export const timestampSchema = z.iso.datetime().describe("ISO-8601 timestamp");

export const idSchema = z.string().min(1).describe("Non-empty identifier");

export const confidenceSchema = z
  .number()
  .min(0)
  .max(1)
  .describe("Number from 0 to 1");
