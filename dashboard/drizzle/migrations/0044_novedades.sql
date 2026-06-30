-- Migration 0044: Novedades / Changelog dinámico
-- Crea la tabla de novedades para gestión dinámica de changelog
-- Reemplaza el array estático en changelog-data.ts como fuente de datos principal

CREATE TABLE IF NOT EXISTS novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(20) NOT NULL DEFAULT 'feature',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_novedades_fecha ON novedades(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_novedades_version ON novedades(version);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_novedades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_novedades_updated_at ON novedades;
CREATE TRIGGER trg_novedades_updated_at
  BEFORE UPDATE ON novedades
  FOR EACH ROW
  EXECUTE FUNCTION update_novedades_updated_at();
