-- Migration 0013: Agregar config_privacidad a tabla tenants
-- Permite configurar el período de retención de datos desde la UI

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS config_privacidad JSONB DEFAULT '{"periodoRetencionBajaDias": 90}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tenants_config_privacidad ON tenants (config_privacidad);
