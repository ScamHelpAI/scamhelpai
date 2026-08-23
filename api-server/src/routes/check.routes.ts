import { Hono } from "hono";
import {
  checkUrlHandler,
  checkUrlsHandler,
} from "../handlers/check.handler.js";

export const checkRoutes = new Hono();

checkRoutes.post("/url", checkUrlHandler);
checkRoutes.post("/urls", checkUrlsHandler);
