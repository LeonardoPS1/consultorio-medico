-- ╔═══════════════════════════════════════════════════════════╗
-- ║  Migration 0035: Portal Booking (Fase 1)                ║
-- ║  - portal_pagos: pagos desde el portal del paciente     ║
-- ║  - portal_config: configuración por tenant              ║
-- ║  - campos de pago en turnos (pagado, precio, etc.)     ║
-- ║  - campos de portal en pacientes (ultimo_acceso, etc.) ║
-- ╚═══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "lead_captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"specialty" varchar(100),
	"size" varchar(50),
	"interests" text[],
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"source" varchar(100) DEFAULT 'landing-contact' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"allow_booking" boolean DEFAULT true NOT NULL,
	"allow_payments" boolean DEFAULT false NOT NULL,
	"max_cancelaciones_mes" integer DEFAULT 3 NOT NULL,
	"booking_lead_time_hours" integer DEFAULT 24 NOT NULL,
	"booking_window_days" integer DEFAULT 30 NOT NULL,
	"deposit_required" boolean DEFAULT false NOT NULL,
	"deposit_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turno_id" uuid NOT NULL,
	"paciente_id" uuid NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"moneda" varchar(10) DEFAULT 'CLP' NOT NULL,
	"metodo_pago" varchar(30) DEFAULT 'mercadopago' NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"mercadopago_preference_id" varchar(255),
	"mercadopago_payment_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"pagado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "ultimo_acceso_portal" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "max_cancelaciones_mes" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "pagado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "precio" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "metodo_pago" varchar(30);--> statement-breakpoint
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "pagado_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_config" ADD CONSTRAINT "portal_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_pagos" ADD CONSTRAINT "portal_pagos_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_pagos" ADD CONSTRAINT "portal_pagos_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lead_captures_email" ON "lead_captures" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lead_captures_status" ON "lead_captures" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lead_captures_created_at" ON "lead_captures" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_pagos_turno" ON "portal_pagos" USING btree ("turno_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_pagos_paciente" ON "portal_pagos" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_portal_pagos_estado" ON "portal_pagos" USING btree ("estado");