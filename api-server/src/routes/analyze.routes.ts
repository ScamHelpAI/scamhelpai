import { Hono } from "hono";
import {
  createAnalysisHandler,
  getAnalysisHandler,
} from "../handlers/analyze.handler.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const analyzeRoutes = new Hono();

// Full analysis runs collector + LLM; keep this strict.
analyzeRoutes.post(
  "/",
  rateLimit({ name: "analyze-create", limit: 10 }),
  createAnalysisHandler,
);

// Clients poll while review finishes.
analyzeRoutes.get(
  "/:id",
  rateLimit({ name: "analyze-get", limit: 60 }),
  getAnalysisHandler,
);
