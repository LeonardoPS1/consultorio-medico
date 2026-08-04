-- Agrega columnas para white-label (dominio custom)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dominio_verificado boolean NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dominio_verificacion_token varchar(64);

-- Partial unique index: solo un tenant puede reclamar un dominio custom
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_dominio_custom_unique
  ON tenants (dominio_custom)
  WHERE dominio_custom IS NOT NULL AND activo = true;
