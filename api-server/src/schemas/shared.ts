import { z } from "zod";

/** ISO-8601 timestamp string. */
export const timestampSchema = z.iso.datetime();

/** Identifier for domain entities (UUID or similar). */
export const idSchema = z.string().min(1);

/** Normalized probability in the range [0, 1]. */
export const confidenceSchema = z.number().min(0).max(1);
