import { Hono } from "hono";
import { z } from "zod";
import { runAnalysis } from "../pipeline/analyze.js";
import type { AnalyzeRequest } from "../types/analyze.js";

const formSchema = z.object({
  action: z.string().optional(),
  inputs: z.array(z.string()).optional(),
});

const analyzeBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("url"),
    url: z.string().min(1),
    text: z.string().optional(),
  }),
  z.object({
    type: z.literal("text"),
    text: z.string().min(1),
    url: z.string().optional(),
  }),
  z.object({
    type: z.literal("webpage"),
    url: z.string().min(1),
    text: z.string().optional(),
    pageTitle: z.string().optional(),
    forms: z.array(formSchema).optional(),
  }),
]);

export const analyzeRoutes = new Hono();

analyzeRoutes.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = analyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400,
    );
  }

  const result = await runAnalysis(parsed.data as AnalyzeRequest);
  return c.json(result);
});
