-- Migration 0017: Push Subscriptions para Web Push API
-- Crea la tabla para almacenar suscripciones de notificaciones push

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  auth VARCHAR(255) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  user_agent TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_usuario ON push_subscriptions(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);

-- Aplicar a dashboard_user
GRANT ALL PRIVILEGES ON TABLE push_subscriptions TO dashboard_user;
