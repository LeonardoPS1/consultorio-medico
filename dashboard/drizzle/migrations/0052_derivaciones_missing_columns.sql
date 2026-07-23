-- Migration 0052: Add missing columns to derivaciones
-- consentimiento_id and tenant_destino_id were added to the Drizzle schema
-- but never migrated to the database
-- FK constraints omitted: referenced tables (consentimiento_compartir) may not exist yet

ALTER TABLE derivaciones
  ADD COLUMN IF NOT EXISTS consentimiento_id UUID,
  ADD COLUMN IF NOT EXISTS tenant_destino_id UUID;
