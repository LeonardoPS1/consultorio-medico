-- Migration: 0011_consentimiento_log
-- Descripción: Crea tabla consentimiento_log para historial de cambios de consentimiento
--              con índices para búsqueda por paciente, tipo y fecha.

CREATE TABLE IF NOT EXISTS "consentimiento_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "paciente_id" uuid NOT NULL REFERENCES "pacientes"("id"),
  "tipo" varchar(30) NOT NULL,
  "accion" varchar(20) NOT NULL,
  "aceptado" boolean NOT NULL,
  "ip" varchar(45),
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_consentimiento_paciente" ON "consentimiento_log"("paciente_id");
CREATE INDEX IF NOT EXISTS "idx_consentimiento_tipo" ON "consentimiento_log"("tipo");
CREATE INDEX IF NOT EXISTS "idx_consentimiento_created_at" ON "consentimiento_log"("created_at");
