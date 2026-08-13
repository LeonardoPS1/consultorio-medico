-- ============================================================
-- MIGRATION 0062: Fix CHECK constraint recetas.estado
-- ============================================================
-- El CHECK constraint (legacy, solo existe en prod) solo permitía
-- valores legacy:
--   activa, vencida, cancelada, renovada
-- Pero el schema actual inserta/actualiza también:
--   borrador, emitida, entregada, anulada, expirada, historial
-- (p.ej. 'historial' al mover una receta al historial vía DELETE,
-- 'anulada' al anular, 'expirada' al vencer).
-- Resultado: mover una receta al historial violaba la constraint →
-- 500 → el tab Historial quedaba vacío.
-- Se dropea y recrea con la UNIÓN de ambos conjuntos para no romper
-- registros históricos, y se alinea el default al schema (emitida).

ALTER TABLE recetas
    DROP CONSTRAINT IF EXISTS recetas_estado_check;

ALTER TABLE recetas
    ADD CONSTRAINT recetas_estado_check
        CHECK (estado IN (
            'activa', 'vencida', 'cancelada', 'renovada',
            'borrador', 'emitida', 'entregada', 'anulada',
            'expirada', 'historial'
        ));

ALTER TABLE recetas
    ALTER COLUMN estado SET DEFAULT 'emitida';
