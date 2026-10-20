import type { Context } from "hono";
import {
  checkUrlRequestSchema,
  checkUrlsRequestSchema,
} from "../schemas/check.js";
import { checkUrl, checkUrls } from "../services/quick-analyze/check.server.js";

export async function checkUrlHandler(c: Context) {
  const body = checkUrlRequestSchema.parse(await c.req.json());
  const result = await checkUrl(body.url);
  return c.json(result);
}

export async function checkUrlsHandler(c: Context) {
  const body = checkUrlsRequestSchema.parse(await c.req.json());
  const results = await checkUrls(body.urls);
  return c.json({ results });
}
