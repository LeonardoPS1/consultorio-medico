-- Migration 0026: Onboarding Progress
-- 
-- Permite persistir el progreso manual del onboarding.
-- Cada vez que un usuario marca un paso como completado,
-- se guarda un registro aquí. getOnboardingState() combina
-- los chequeos reales de DB + este progreso manual.

CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    step_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_usuario 
    ON onboarding_progress(usuario_id);
