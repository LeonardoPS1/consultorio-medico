-- Migration 0015: Agregar hash_verificacion a recetas para firma digital QR

ALTER TABLE recetas ADD COLUMN IF NOT EXISTS hash_verificacion VARCHAR(64);

-- Índice para búsqueda rápida por hash
CREATE INDEX IF NOT EXISTS idx_recetas_hash_verificacion ON recetas (hash_verificacion);
