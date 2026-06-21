CREATE TABLE IF NOT EXISTS "ordenes_estudio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid,
	"turno_id" uuid,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"tipo" varchar(50) DEFAULT 'laboratorio' NOT NULL,
	"estado" varchar(30) DEFAULT 'pendiente' NOT NULL,
	"resultado_url" text,
	"observaciones" text,
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notificaciones" ADD COLUMN "paciente_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordenes_estudio" ADD CONSTRAINT "ordenes_estudio_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordenes_estudio" ADD CONSTRAINT "ordenes_estudio_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ordenes_estudio" ADD CONSTRAINT "ordenes_estudio_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ordenes_estudio_paciente" ON "ordenes_estudio" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ordenes_estudio_medico" ON "ordenes_estudio" USING btree ("medico_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ordenes_estudio_estado" ON "ordenes_estudio" USING btree ("estado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ordenes_estudio_created_at" ON "ordenes_estudio" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificaciones_paciente" ON "notificaciones" USING btree ("paciente_id");