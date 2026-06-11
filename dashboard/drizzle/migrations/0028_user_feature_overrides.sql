-- Migration 0028: Per-user feature overrides
-- Permite a un admin habilitar features de planes superiores
-- para usuarios específicos (ej: feature Premium para usuario Profesional)

CREATE TABLE IF NOT EXISTS user_feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    feature_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_usuario
    ON user_feature_overrides(usuario_id);
