-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0001: Configuración de Alertas
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 5. Configuración de Alertas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.alerts_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    threshold_value INTEGER NOT NULL,
    threshold_window_minutes INTEGER NOT NULL DEFAULT 60,
    notification_channels JSON NOT NULL DEFAULT '[]',
    channel_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_config_active
    ON platform.alerts_config(is_active);

CREATE INDEX IF NOT EXISTS idx_alerts_config_alert_name
    ON platform.alerts_config(alert_name);

-- ─── 6. Historial de Alertas Disparadas ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.alerts_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_config_id UUID NOT NULL REFERENCES platform.alerts_config(id) ON DELETE CASCADE,
    tenant_id UUID,
    tenant_nombre VARCHAR(255),
    trigger_value INTEGER NOT NULL,
    threshold_value INTEGER NOT NULL,
    message TEXT,
    notifications_sent JSON NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_history_config_id
    ON platform.alerts_history(alert_config_id);

CREATE INDEX IF NOT EXISTS idx_alerts_history_created_at
    ON platform.alerts_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_history_tenant_id
    ON platform.alerts_history(tenant_id);

-- ─── Trigger: actualizar updated_at en alerts_config ─────────────────────────
CREATE OR REPLACE FUNCTION platform.update_alerts_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alerts_config_updated_at
    BEFORE UPDATE ON platform.alerts_config
    FOR EACH ROW EXECUTE FUNCTION platform.update_alerts_config_updated_at();

-- ─── Default Alert Configurations ────────────────────────────────────────────
INSERT INTO platform.alerts_config (alert_name, display_name, description, threshold_value, threshold_window_minutes, notification_channels, channel_config, is_active) VALUES
('payment_failure', 'Pagos Fallidos', 'Alerta cuando un tenant tiene más de N pagos fallidos en la ventana de tiempo', 3, 60, '[]'::json, '{}'::jsonb, false),
('evolution_down', 'WhatsApp Desconectado', 'Alerta cuando la instancia de WhatsApp/Evolution de un tenant está caída', 1, 15, '[]'::json, '{}'::jsonb, false),
('error_rate', 'Tasa de Errores Elevada', 'Alerta cuando un tenant supera N errores en la ventana de tiempo', 10, 60, '[]'::json, '{}'::jsonb, false),
('infra_down', 'Servicio Core Caído', 'Alerta cuando un servicio de infraestructura crítico (PostgreSQL, Redis, n8n) está caído', 1, 5, '[]'::json, '{}'::jsonb, true)
ON CONFLICT (alert_name) DO NOTHING;