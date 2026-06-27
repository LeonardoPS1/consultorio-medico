-- Migration 0042: Notification improvements
-- 1. Add silenciar_por_tipo JSONB column to preferencias_notificaciones
-- 2. Add prioridad column to notificaciones (priority ordering)
-- 3. Backfill prioridad based on existing tipo values
-- 4. Add index on prioridad for efficient sorting

-- Step 1: Add silenciar_por_tipo to preferencias_notificaciones
ALTER TABLE preferencias_notificaciones
  ADD COLUMN IF NOT EXISTS silenciar_por_tipo JSONB DEFAULT '{"turno":false,"mensaje":false,"receta":false,"urgencia":false,"sistema":false}'::jsonb;

-- Step 2: Add prioridad to notificaciones
ALTER TABLE notificaciones
  ADD COLUMN IF NOT EXISTS prioridad INTEGER NOT NULL DEFAULT 4;

-- Step 3: Backfill prioridad based on tipo
-- Priority mapping: urgencia=0 (highest), receta=1, turno=2, mensaje=3, sistema=4 (lowest)
UPDATE notificaciones SET prioridad = 0 WHERE tipo = 'urgencia' AND prioridad = 4;
UPDATE notificaciones SET prioridad = 1 WHERE tipo = 'receta' AND prioridad = 4;
UPDATE notificaciones SET prioridad = 2 WHERE tipo = 'turno' AND prioridad = 4;
UPDATE notificaciones SET prioridad = 3 WHERE tipo = 'mensaje' AND prioridad = 4;
-- sistema already defaults to 4

-- Step 4: Add index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_notificaciones_prioridad ON notificaciones (usuario_id, prioridad);

-- Step 5: Add composite index for type-based unread counts
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo_leido ON notificaciones (usuario_id, tipo, leido)
  WHERE deleted_at IS NULL;
