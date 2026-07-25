-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 0000: AicoreOps — Schema de plataforma
-- ══════════════════════════════════════════════════════════════════════════════
-- Este schema está AISLADO del schema `public` de los tenants.
-- La app ops-console es el único sistema que accede a estas tablas.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Schema ─────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS platform;

-- ─── 1. Operadores de Plataforma ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.platform_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    totp_secret VARCHAR(255),
    totp_verified BOOLEAN DEFAULT false NOT NULL,
    setup_token VARCHAR(255),
    setup_token_expires TIMESTAMPTZ,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 2. Passkeys (WebAuthn Credentials) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.platform_passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES platform.platform_operators(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT[] DEFAULT '{}',
    device_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_passkeys_operator_id
    ON platform.platform_passkeys(operator_id);

-- ─── 3. Sesiones JWT (tracking para revocación) ────────────────────────────
CREATE TABLE IF NOT EXISTS platform.platform_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES platform.platform_operators(id) ON DELETE CASCADE,
    jti VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_operator_id
    ON platform.platform_sessions(operator_id);

CREATE INDEX IF NOT EXISTS idx_sessions_jti
    ON platform.platform_sessions(jti);

-- ─── 4. Auditoría (APPEND-ONLY) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.platform_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID,
    operator_email VARCHAR(255) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    tenant_afectado VARCHAR(255),
    recurso VARCHAR(255),
    motivo TEXT,
    ip_address INET,
    detalles JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON platform.platform_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_operator_id
    ON platform.platform_audit_log(operator_id);

CREATE INDEX IF NOT EXISTS idx_audit_accion
    ON platform.platform_audit_log(accion);

-- ─── Trigger: bloquea UPDATE/DELETE en audit_log ──────────────────────────
CREATE OR REPLACE FUNCTION platform.audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'platform_audit_log es append-only: no se permite UPDATE o DELETE'
          USING HINT = 'Inserte un nuevo registro en vez de modificar uno existente';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_append_only
    BEFORE UPDATE OR DELETE ON platform.platform_audit_log
    FOR EACH ROW EXECUTE FUNCTION platform.audit_log_append_only();

-- ══════════════════════════════════════════════════════════════════════════════
-- NOTA: La creación del rol platform_admin_role y del usuario ops_console_user
-- se realiza con el script scripts/bootstrap-ops.ts, no en esta migración.
-- Ver docs/ops-role-isolation.md para la documentación de seguridad.
-- ══════════════════════════════════════════════════════════════════════════════
