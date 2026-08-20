import { Hono } from "hono";
import { env } from "./config/env.js";
import { analyzeRequestSchema } from "./schemas/analysis-input.js";
import { runAnalysis } from "./services/analysis.server.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/analyze", async (c) => {
  const body = analyzeRequestSchema.parse(await c.req.json());
  const result = await runAnalysis(body);
  return c.json(result);
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
