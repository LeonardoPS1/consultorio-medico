-- 0050: Webhooks salientes por tenant
CREATE TABLE IF NOT EXISTS webhook_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  evento            VARCHAR(50) NOT NULL,
  url               TEXT NOT NULL,
  secret            VARCHAR(64) NOT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_estado     VARCHAR(20) DEFAULT 'pendiente',
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_configs_tenant ON webhook_configs(tenant_id);
CREATE INDEX idx_webhook_configs_evento ON webhook_configs(evento);
CREATE UNIQUE INDEX uq_webhook_tenant_evento_url ON webhook_configs(tenant_id, evento, url);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id         UUID NOT NULL REFERENCES webhook_configs(id),
  evento            VARCHAR(50) NOT NULL,
  payload           JSONB DEFAULT '{}',
  url               TEXT NOT NULL,
  status_code       INTEGER,
  respuesta         TEXT,
  duracion_ms       INTEGER,
  intentos          INTEGER NOT NULL DEFAULT 1,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_config ON webhook_logs(config_id);
CREATE INDEX idx_webhook_logs_evento ON webhook_logs(evento);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);