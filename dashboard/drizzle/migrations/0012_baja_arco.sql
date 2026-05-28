-- Migration 0012: Add baja_solicitada_at to pacientes table
-- Permite persistir el estado de solicitud de baja ARCO.

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS baja_solicitada_at TIMESTAMP WITH TIME ZONE;

-- Index para búsquedas de pacientes con baja solicitada
CREATE INDEX IF NOT EXISTS idx_pacientes_baja_solicitada ON pacientes (baja_solicitada_at)
  WHERE baja_solicitada_at IS NOT NULL AND deleted_at IS NULL;
