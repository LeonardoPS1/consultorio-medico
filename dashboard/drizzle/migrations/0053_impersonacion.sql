-- Migration 0053: Tabla de tokens de impersonación
-- Permite que operadores del platform ingresen como administrador de tenant

CREATE TABLE IF NOT EXISTS impersonation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  creado_por_operator_id VARCHAR(255) NOT NULL,
  creado_por_operator_email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_token ON impersonation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_tenant ON impersonation_tokens(tenant_id);
