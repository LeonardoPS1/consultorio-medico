-- ============================================================
-- Migration 0004: API Pública
-- Tabla de API keys para integraciones externas
-- ============================================================
-- Uso:  psql -U dashboard_user -d consultorio_medico -f 0004_api_publica.sql
-- En Docker: docker exec -i postgres psql -U dashboard_user -d consultorio_medico < 0004_api_publica.sql

-- ─── 1. Crear tabla api_keys ─────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  nombre VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  activa BOOLEAN NOT NULL DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Índices ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys (tenant_id);
