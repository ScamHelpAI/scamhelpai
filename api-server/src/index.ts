import { Hono } from "hono";
import { logger } from "hono/logger";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createRoutes } from "./routes/index.js";

const app = new Hono();

app.use("*", logger());
app.onError(errorHandler);
app.route("/", createRoutes());

export default {
  port: env.PORT,
  fetch: app.fetch,
};
