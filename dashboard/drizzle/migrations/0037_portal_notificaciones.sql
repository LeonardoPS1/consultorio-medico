-- Migration 0037: Portal — Notificaciones para pacientes
-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  - Agrega paciente_id a la tabla notificaciones              ║
-- ║  - Permite enviar notificaciones a pacientes del portal      ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Agregar columna paciente_id a notificaciones
ALTER TABLE "notificaciones" ADD COLUMN IF NOT EXISTS "paciente_id" uuid;
--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificaciones_paciente" ON "notificaciones" USING btree ("paciente_id");
