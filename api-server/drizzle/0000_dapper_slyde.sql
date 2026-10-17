CREATE TYPE "public"."agent_role" AS ENUM('analyst', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('queued', 'analyzing', 'reviewing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('pending', 'uploaded', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."check_status" AS ENUM('safe', 'warning', 'danger');--> statement-breakpoint
CREATE TYPE "public"."evidence_source" AS ENUM('user_input', 'analyst', 'tool', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('visual', 'text', 'url', 'domain', 'email', 'threat_intel', 'identity', 'file', 'external', 'model_inference');--> statement-breakpoint
CREATE TYPE "public"."feedback_verdict" AS ENUM('correct', 'incorrect', 'partially_correct');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."scam_type" AS ENUM('credential_phishing', 'impersonation', 'tech_support', 'investment', 'romance', 'job', 'invoice', 'payment', 'crypto', 'account_takeover', 'malware', 'other', 'unknown');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"role" "agent_role" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "analysis_status" DEFAULT 'queued' NOT NULL,
	"risk_score" real,
	"risk_level" "risk_level",
	"confidence" real,
	"scam_type" "scam_type",
	"claimed_identity" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "analysis_assets" (
	"analysis_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_assets_analysis_id_asset_id_pk" PRIMARY KEY("analysis_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "analysis_inputs" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"position" integer NOT NULL,
	"input" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer,
	"status" "asset_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "domain_check_cache" (
	"hostname" text PRIMARY KEY NOT NULL,
	"status" "check_status" NOT NULL,
	"score" integer NOT NULL,
	"reasons" jsonb NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text NOT NULL,
	"analysis_id" text NOT NULL,
	"type" "evidence_type" NOT NULL,
	"source" "evidence_source" NOT NULL,
	"summary" text NOT NULL,
	"confidence" real NOT NULL,
	"data" jsonb,
	"source_input_id" text,
	"tool_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_analysis_id_id_pk" PRIMARY KEY("analysis_id","id")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"verdict" "feedback_verdict" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"agent_run_id" text NOT NULL,
	"tool" text NOT NULL,
	"arguments_json" jsonb NOT NULL,
	"result_json" jsonb,
	"success" boolean NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "url_check_cache" (
	"url_hash" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"hostname" text NOT NULL,
	"status" "check_status" NOT NULL,
	"score" integer NOT NULL,
	"reasons" jsonb NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_assets" ADD CONSTRAINT "analysis_assets_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_assets" ADD CONSTRAINT "analysis_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_inputs" ADD CONSTRAINT "analysis_inputs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_check_cache_expires_at_idx" ON "domain_check_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "domain_check_cache_hit_count_idx" ON "domain_check_cache" USING btree ("hit_count");--> statement-breakpoint
CREATE INDEX "url_check_cache_expires_at_idx" ON "url_check_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "url_check_cache_hit_count_idx" ON "url_check_cache" USING btree ("hit_count");--> statement-breakpoint
CREATE INDEX "url_check_cache_hostname_idx" ON "url_check_cache" USING btree ("hostname");