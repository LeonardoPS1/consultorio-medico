-- ============================================================
-- Migration 010: Suscripciones (MercadoPago)
-- ============================================================

-- Tabla de suscripciones/planes por organización
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  plan VARCHAR(50) NOT NULL DEFAULT 'free',           -- free, starter, professional, premium, enterprise
  estado VARCHAR(50) NOT NULL DEFAULT 'free',          -- free, pending, active, cancelled, expired, paused
  mercadopago_preference_id VARCHAR(255),
  mercadopago_payment_id VARCHAR(255),
  mercadopago_merchant_order_id VARCHAR(255),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_suscripciones_org ON suscripciones(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_mp_pref ON suscripciones(mercadopago_preference_id);
