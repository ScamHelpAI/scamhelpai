import { Hono } from "hono";
import {
  checkUrlHandler,
  checkUrlsHandler,
} from "../handlers/check.handler.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const checkRoutes = new Hono();

// Extension link scans can be chatty; keep single-URL checks generous.
checkRoutes.post(
  "/url",
  rateLimit({ name: "check-url", limit: 120 }),
  checkUrlHandler,
);

// Batch checks are heavier (up to 100 URLs).
checkRoutes.post(
  "/urls",
  rateLimit({ name: "check-urls", limit: 30 }),
  checkUrlsHandler,
);
