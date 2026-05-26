-- Migration: 0010_auditoria_tenant
-- Descripción: Agrega tenant_id a auditoria_accesos para multi-tenant + índice

ALTER TABLE "auditoria_accesos"
ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "tenants"("id");

CREATE INDEX IF NOT EXISTS "idx_auditoria_tenant" ON "auditoria_accesos"("tenant_id");
