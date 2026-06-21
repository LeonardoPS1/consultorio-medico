CREATE TABLE IF NOT EXISTS "paquetes_portal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"cantidad_turnos" integer NOT NULL,
	"precio" integer NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suscripciones_paciente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"paquete_id" uuid NOT NULL,
	"turnos_restantes" integer NOT NULL,
	"turnos_totales" integer NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"vencimiento" timestamp with time zone,
	"pagado" boolean DEFAULT false NOT NULL,
	"mercadopago_payment_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paquetes_portal" ADD CONSTRAINT "paquetes_portal_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suscripciones_paciente" ADD CONSTRAINT "suscripciones_paciente_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suscripciones_paciente" ADD CONSTRAINT "suscripciones_paciente_paquete_id_paquetes_portal_id_fk" FOREIGN KEY ("paquete_id") REFERENCES "public"."paquetes_portal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_paquetes_portal_activo" ON "paquetes_portal" USING btree ("activo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_susc_paciente_activa" ON "suscripciones_paciente" USING btree ("paciente_id","activa");