CREATE TABLE IF NOT EXISTS "web_vitals_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(20) NOT NULL,
	"value" numeric NOT NULL,
	"rating" varchar(20) NOT NULL,
	"url" text,
	"user_agent" text,
	"medico_id" uuid,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_web_vitals_name" ON "web_vitals_metrics" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_web_vitals_created_at" ON "web_vitals_metrics" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_web_vitals_url" ON "web_vitals_metrics" USING btree ("url");
CREATE INDEX IF NOT EXISTS "idx_web_vitals_tenant" ON "web_vitals_metrics" USING btree ("tenant_id");
