-- ============================================================
-- Migration 0005: Portal del Paciente
-- Agrega columnas de auth token a la tabla pacientes
-- ============================================================

-- ─── 1. Agregar portal_token a pacientes ─────────────────────
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS portal_token VARCHAR(255);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS portal_token_expires TIMESTAMPTZ;

-- ─── 2. Índice para búsqueda rápida de tokens ───────────────
CREATE INDEX IF NOT EXISTS idx_pacientes_portal_token ON pacientes (portal_token) WHERE portal_token IS NOT NULL;
