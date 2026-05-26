-- Migration: 0009_multi_sucursal
-- Descripción: Tabla sucursales + FK en medicos, pacientes, turnos, horarios_atencion

-- 1. Crear tabla sucursales
CREATE TABLE IF NOT EXISTS "sucursales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES "tenants"("id"),
  "nombre" varchar(255) NOT NULL,
  "direccion" text,
  "telefono" varchar(20),
  "email" varchar(255),
  "activo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Agregar columna sucursal_id a medicos
ALTER TABLE "medicos" ADD COLUMN IF NOT EXISTS "sucursal_id" uuid REFERENCES "sucursales"("id");

-- 3. Agregar columna sucursal_id a pacientes
ALTER TABLE "pacientes" ADD COLUMN IF NOT EXISTS "sucursal_id" uuid REFERENCES "sucursales"("id");

-- 4. Agregar columna sucursal_id a turnos
ALTER TABLE "turnos" ADD COLUMN IF NOT EXISTS "sucursal_id" uuid REFERENCES "sucursales"("id");

-- 5. Agregar columna sucursal_id a horarios_atencion
ALTER TABLE "horarios_atencion" ADD COLUMN IF NOT EXISTS "sucursal_id" uuid REFERENCES "sucursales"("id");

-- 6. Index para búsquedas por sucursal
CREATE INDEX IF NOT EXISTS "idx_medicos_sucursal" ON "medicos"("sucursal_id");
CREATE INDEX IF NOT EXISTS "idx_pacientes_sucursal" ON "pacientes"("sucursal_id");
CREATE INDEX IF NOT EXISTS "idx_turnos_sucursal" ON "turnos"("sucursal_id");
CREATE INDEX IF NOT EXISTS "idx_horarios_sucursal" ON "horarios_atencion"("sucursal_id");
