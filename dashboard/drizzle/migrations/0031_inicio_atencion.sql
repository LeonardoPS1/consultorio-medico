-- Migration 0031: Agregar columna inicio_atencion_at a turnos
-- Permite trackear cuánto tiempo lleva cada paciente en atención
-- Se setea automáticamente cuando el estado cambia a 'en_atencion'

ALTER TABLE turnos ADD COLUMN IF NOT EXISTS inicio_atencion_at TIMESTAMPTZ;
