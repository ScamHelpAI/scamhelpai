import { Hono } from "hono";
import { healthHandler, readyHandler } from "../handlers/health.handler.js";

export const healthRoutes = new Hono();

healthRoutes.get("/health", healthHandler);
healthRoutes.get("/ready", readyHandler);
