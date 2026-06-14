CREATE TABLE IF NOT EXISTS "blacklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"creado_por" uuid,
	"sucursal_id" uuid,
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consentimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"tipo" varchar(50) DEFAULT 'general' NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"fecha_firma" timestamp with time zone,
	"ip_firma" varchar(50),
	"nombre_paciente" varchar(255) NOT NULL,
	"rut_paciente" varchar(20),
	"documento_pdf" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"medico_id" uuid,
	"sucursal_id" uuid,
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_creado_por_medicos_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_sucursal_id_sucursales_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_sucursal_id_sucursales_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blacklist_paciente" ON "blacklist" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blacklist_activo" ON "blacklist" USING btree ("activo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blacklist_created_at" ON "blacklist" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consentimientos_paciente" ON "consentimientos" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consentimientos_tipo" ON "consentimientos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consentimientos_created_at" ON "consentimientos" USING btree ("created_at");
