-- ============================================================
-- MIGRATION 007: Credenciales Centralizadas
-- ============================================================
-- Almacena API keys, tokens y credenciales de servicios externos.
-- Los valores se guardan encriptados (AES-256-GCM).
-- Solo usuarios con rol 'admin' pueden gestionar credenciales.
-- ============================================================

CREATE TABLE IF NOT EXISTS credenciales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Servicio al que pertenece (twilio, ollama, n8n, postgres, smtp, imap, google_calendar)
    servicio VARCHAR(50) NOT NULL,
    -- Clave dentro del servicio (account_sid, auth_token, api_key, host, port, etc.)
    clave VARCHAR(100) NOT NULL,
    -- Valor actual (encriptado con AES-256-GCM usando AUTH_SECRET)
    valor TEXT NOT NULL,
    -- ¿Está encriptado? Siempre TRUE excepto durante migraciones
    encriptado BOOLEAN NOT NULL DEFAULT TRUE,
    -- Etiqueta visible para el usuario
    etiqueta VARCHAR(255),
    -- ID de la credential en n8n (para sincronización automática)
    n8n_credential_id VARCHAR(255),
    -- Tipo de credential en n8n (twilioApi, ollamaApi, etc.)
    n8n_credential_type VARCHAR(100),
    -- Orden de visualización en la UI
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unique por servicio + clave
    UNIQUE (servicio, clave)
);

-- ============================================================
-- VISTA: credenciales_activas (filtra soft-delete)
-- ============================================================
CREATE OR REPLACE VIEW credenciales_activas AS
SELECT * FROM credenciales
ORDER BY orden, servicio, clave;

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE TRIGGER set_credenciales_updated_at
    BEFORE UPDATE ON credenciales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_credenciales_servicio ON credenciales(servicio);
CREATE INDEX IF NOT EXISTS idx_credenciales_n8n ON credenciales(n8n_credential_id)
    WHERE n8n_credential_id IS NOT NULL;
