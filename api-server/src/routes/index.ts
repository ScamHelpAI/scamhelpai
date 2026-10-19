import { Hono } from "hono";
import { analyzeRoutes } from "./analyze.routes.js";
import { assetRoutes } from "./asset.routes.js";
import { checkRoutes } from "./check.routes.js";
import { healthRoutes } from "./health.routes.js";

export function createRoutes() {
  const app = new Hono();

  app.route("/", healthRoutes);
  app.route("/v1/assets", assetRoutes);
  app.route("/v1/check", checkRoutes);
  app.route("/v1/analyses", analyzeRoutes);

  return app;
}
