-- Migration 0053: Impersonation tokens for "Entrar como" support feature
-- Permite a operadores de AicoreOps acceder al dashboard de un tenant
-- sin exponer contraseñas, con token de un solo uso y expiración de 1 hora

CREATE TABLE IF NOT EXISTS impersonation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  creado_por VARCHAR(255) NOT NULL,
  creado_por_nombre VARCHAR(255),
  motivo TEXT NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  usado_por VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_token ON impersonation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_tenant ON impersonation_tokens(tenant_id);
