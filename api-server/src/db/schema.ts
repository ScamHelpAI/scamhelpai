import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const analysisStatusEnum = pgEnum("analysis_status", [
  "queued",
  "analyzing",
  "reviewing",
  "completed",
  "failed",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const scamTypeEnum = pgEnum("scam_type", [
  "credential_phishing",
  "impersonation",
  "tech_support",
  "investment",
  "romance",
  "job",
  "invoice",
  "payment",
  "crypto",
  "account_takeover",
  "malware",
  "other",
  "unknown",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "pending",
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "visual",
  "text",
  "url",
  "domain",
  "email",
  "threat_intel",
  "identity",
  "file",
  "external",
  "model_inference",
]);

export const evidenceSourceEnum = pgEnum("evidence_source", [
  "user_input",
  "analyst",
  "tool",
  "reviewer",
]);

export const agentRoleEnum = pgEnum("agent_role", ["analyst", "reviewer"]);

export const feedbackVerdictEnum = pgEnum("feedback_verdict", [
  "correct",
  "incorrect",
  "partially_correct",
]);

const createdAt = timestamp("created_at", {
  withTimezone: true,
  mode: "string",
})
  .notNull()
  .defaultNow();

export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  status: analysisStatusEnum("status").notNull().default("queued"),
  riskScore: real("risk_score"),
  riskLevel: riskLevelEnum("risk_level"),
  confidence: real("confidence"),
  scamType: scamTypeEnum("scam_type"),
  claimedIdentity: text("claimed_identity"),
  summary: text("summary"),
  createdAt,
  completedAt: timestamp("completed_at", {
    withTimezone: true,
    mode: "string",
  }),
});

export const analysisInputs = pgTable("analysis_inputs", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  input: jsonb("input").notNull(),
  createdAt,
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes"),
  status: assetStatusEnum("status").notNull().default("pending"),
  createdAt,
  uploadedAt: timestamp("uploaded_at", {
    withTimezone: true,
    mode: "string",
  }),
  metadata: jsonb("metadata"),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  type: evidenceTypeEnum("type").notNull(),
  source: evidenceSourceEnum("source").notNull(),
  summary: text("summary").notNull(),
  confidence: real("confidence").notNull(),
  data: jsonb("data"),
  sourceInputId: text("source_input_id"),
  toolName: text("tool_name"),
  createdAt,
});

export const agentRuns = pgTable("agent_runs", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  role: agentRoleEnum("role").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  resultJson: jsonb("result_json").notNull(),
  createdAt,
});

export const toolCalls = pgTable("tool_calls", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  agentRunId: text("agent_run_id")
    .notNull()
    .references(() => agentRuns.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  argumentsJson: jsonb("arguments_json").notNull(),
  resultJson: jsonb("result_json"),
  success: boolean("success").notNull(),
  durationMs: integer("duration_ms"),
  createdAt,
});

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  verdict: feedbackVerdictEnum("verdict").notNull(),
  comment: text("comment"),
  createdAt,
});

export const analysisAssets = pgTable(
  "analysis_assets",
  {
    analysisId: text("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.analysisId, table.assetId] })],
);

export const analysesRelations = relations(analyses, ({ many }) => ({
  inputs: many(analysisInputs),
  evidence: many(evidence),
  agentRuns: many(agentRuns),
  toolCalls: many(toolCalls),
  feedback: many(feedback),
  analysisAssets: many(analysisAssets),
}));

export const analysisInputsRelations = relations(analysisInputs, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisInputs.analysisId],
    references: [analyses.id],
  }),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  analysis: one(analyses, {
    fields: [evidence.analysisId],
    references: [analyses.id],
  }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
  analysis: one(analyses, {
    fields: [agentRuns.analysisId],
    references: [analyses.id],
  }),
  toolCalls: many(toolCalls),
}));

export const toolCallsRelations = relations(toolCalls, ({ one }) => ({
  analysis: one(analyses, {
    fields: [toolCalls.analysisId],
    references: [analyses.id],
  }),
  agentRun: one(agentRuns, {
    fields: [toolCalls.agentRunId],
    references: [agentRuns.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  analysis: one(analyses, {
    fields: [feedback.analysisId],
    references: [analyses.id],
  }),
}));

export const analysisAssetsRelations = relations(analysisAssets, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisAssets.analysisId],
    references: [analyses.id],
  }),
  asset: one(assets, {
    fields: [analysisAssets.assetId],
    references: [assets.id],
  }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  analysisAssets: many(analysisAssets),
}));
