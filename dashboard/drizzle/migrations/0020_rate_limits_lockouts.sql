-- Migration 0020: Rate limits + Account lockouts persistentes en PostgreSQL
-- Reemplaza almacenamiento in-memory que se perdía al reiniciar

CREATE TABLE IF NOT EXISTS "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"max_requests" integer NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_ms" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_rate_limits_key" ON "rate_limits" USING btree ("key");

CREATE TABLE IF NOT EXISTS "account_lockouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_account_lockouts_email" ON "account_lockouts" USING btree ("email");
