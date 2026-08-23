import type { Context } from "hono";
import { getReadiness } from "../services/health.server.js";

export function healthHandler(c: Context) {
  return c.json({ status: "ok" });
}

export async function readyHandler(c: Context) {
  const readiness = await getReadiness();
  const statusCode = readiness.status === "not_ready" ? 503 : 200;
  return c.json(readiness, statusCode);
}
