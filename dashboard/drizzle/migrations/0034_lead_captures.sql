CREATE TABLE IF NOT EXISTS "lead_captures" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(50),
  "specialty" varchar(100),
  "size" varchar(50),
  "interests" text[],
  "status" varchar(20) NOT NULL DEFAULT 'new',
  "source" varchar(100) NOT NULL DEFAULT 'landing-contact',
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_lead_captures_email" ON "lead_captures" ("email");
CREATE INDEX IF NOT EXISTS "idx_lead_captures_status" ON "lead_captures" ("status");
CREATE INDEX IF NOT EXISTS "idx_lead_captures_created_at" ON "lead_captures" ("created_at");
