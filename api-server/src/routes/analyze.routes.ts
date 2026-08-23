import { Hono } from "hono";
import {
  createAnalysisHandler,
  getAnalysisHandler,
} from "../handlers/analyze.handler.js";

export const analyzeRoutes = new Hono();

analyzeRoutes.post("/", createAnalysisHandler);
analyzeRoutes.get("/:id", getAnalysisHandler);
