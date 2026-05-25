-- ============================================================
-- Migration 0006: Feature Toggles + Admin System Panel
-- Agrega features_enabled JSONB a tenants para que los admins
-- puedan activar/desactivar funcionalidades a nivel tenant.
-- ============================================================
-- Uso: cat 0006_feature_toggles.sql | docker exec -i postgres_container psql -U dashboard_user -d consultorio_medico

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tenants.features_enabled IS 'Feature toggles a nivel tenant. Ej: {"horarios": true, "ia-assistant": false}';
