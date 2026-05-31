-- Migration 0019: Agrega soporte para certificados médicos con hash de verificación
-- Modifica tabla historial_medico

ALTER TABLE historial_medico
  ADD COLUMN IF NOT EXISTS hash_verificacion VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pdf_generado BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para búsqueda de hash
CREATE INDEX IF NOT EXISTS idx_historial_hash_verificacion ON historial_medico(hash_verificacion);
