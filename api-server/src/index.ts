import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyzeRoutes } from "./routes/analyze.js";

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.route("/analyze", analyzeRoutes);

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

export default app;
