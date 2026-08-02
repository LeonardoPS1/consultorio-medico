-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 0002: platform.login_attempts — Rate limiting de login
-- ══════════════════════════════════════════════════════════════════════════════
-- Tabla para rastrear intentos de login (exitosos y fallidos) y aplicar
-- rate limiting: máximo 5 intentos fallidos en 15 minutos por identificador.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Tabla login_attempts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    exitoso BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice compuesto para consultar intentos fallidos recientes por identificador
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created
    ON platform.login_attempts (identifier, created_at DESC);

-- Índice para limpieza periódica de intentos antiguos (opcional, para mantenimiento)
CREATE INDEX IF NOT EXISTS idx_login_attempts_created
    ON platform.login_attempts (created_at DESC);

-- ─── Comentarios para documentación ───────────────────────────────────────────
COMMENT ON TABLE platform.login_attempts IS
    'Registra cada intento de login (éxito/fallo) para rate limiting. ' ||
    'Máximo 5 fallos en 15 min bloquea el identificador por 15 min desde el último fallo.';
COMMENT ON COLUMN platform.login_attempts.identifier IS
    'Email u otro identificador usado en el intento de login';
COMMENT ON COLUMN platform.login_attempts.exitoso IS
    'true si el login fue exitoso, false si falló';
COMMENT ON COLUMN platform.login_attempts.created_at IS
    'Timestamp del intento, usado para ventana deslizante de 15 min';