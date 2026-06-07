-- Migration 0025: Índices de optimización para queries más usadas
-- Ver análisis completo en memoria persistente (sesión 07/06/2026)
--
-- ⚠️ Para producción sin downtime: ejecutar cada CREATE INDEX por separado
--    con CREATE INDEX CONCURRENTLY desde psql (ver abajo). Esta migration
--    usa CREATE INDEX estándar (bloquea escrituras brevemente).
--
-- ⚠️ Requiere extensión pg_trgm para índices de búsqueda textual.
--    Si no está instalada: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ──────────────────────────────────────────────────────────────────
-- 0. Asegurar extensión pg_trgm para búsqueda ILIKE
-- ──────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ──────────────────────────────────────────────────────────────────
-- 1. TURNOS — La tabla más query-heavy sin índices
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_hora
  ON turnos (fecha_hora);

CREATE INDEX IF NOT EXISTS idx_turnos_medico_fecha
  ON turnos (medico_id, fecha_hora);

CREATE INDEX IF NOT EXISTS idx_turnos_estado
  ON turnos (estado);

CREATE INDEX IF NOT EXISTS idx_turnos_paciente_id
  ON turnos (paciente_id);

CREATE INDEX IF NOT EXISTS idx_turnos_sucursal_id
  ON turnos (sucursal_id);

-- Partial index: solo turnos activos (para conflict check + listados)
CREATE INDEX IF NOT EXISTS idx_turnos_activos_medico_fecha
  ON turnos (medico_id, fecha_hora)
  WHERE deleted_at IS NULL AND estado NOT IN ('cancelada', 'no_asistio');

-- ──────────────────────────────────────────────────────────────────
-- 2. PACIENTES — Búsquedas frecuentes sin índices
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pacientes_sucursal_id
  ON pacientes (sucursal_id);

CREATE INDEX IF NOT EXISTS idx_pacientes_created_at
  ON pacientes (created_at);

-- Índices trigram para ILIKE rápido en nombre y apellido
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre_trgm
  ON pacientes USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pacientes_apellido_trgm
  ON pacientes USING gin (apellido gin_trgm_ops);

-- ──────────────────────────────────────────────────────────────────
-- 3. MENSAJES — Joins frecuentes + dashboard stats
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_id
  ON mensajes (conversacion_id);

CREATE INDEX IF NOT EXISTS idx_mensajes_rol_created
  ON mensajes (rol, created_at);

CREATE INDEX IF NOT EXISTS idx_mensajes_twilio_sid
  ON mensajes (twilio_sid);

-- ──────────────────────────────────────────────────────────────────
-- 4. MEDICOS — Resolución user→doctor + filtro sucursal
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_medicos_usuario_id
  ON medicos (usuario_id);

CREATE INDEX IF NOT EXISTS idx_medicos_sucursal_id
  ON medicos (sucursal_id);

-- ──────────────────────────────────────────────────────────────────
-- 5. RECETAS — Historial por paciente + scope médico
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recetas_paciente_id
  ON recetas (paciente_id);

CREATE INDEX IF NOT EXISTS idx_recetas_medico_id
  ON recetas (medico_id);

-- ──────────────────────────────────────────────────────────────────
-- 6. BLOQUEOS AGENDA — Verificación disponibilidad
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bloqueos_medico_fecha
  ON bloqueos_agenda (medico_id, fecha_inicio, fecha_fin);

-- ──────────────────────────────────────────────────────────────────
-- 7. CONVERSACIONES — Índices adicionales
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversaciones_paciente_id
  ON conversaciones (paciente_id);

CREATE INDEX IF NOT EXISTS idx_conversaciones_medico_id
  ON conversaciones (medico_id);

-- ──────────────────────────────────────────────────────────────────
-- 8. HISTORIAL MÉDICO — Consultas por paciente/médico
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_historial_paciente_id
  ON historial_medico (paciente_id);

CREATE INDEX IF NOT EXISTS idx_historial_medico_id
  ON historial_medico (medico_id);

-- ──────────────────────────────────────────────────────────────────
-- 9. NOTAS SOAP — Consultas por paciente/médico/turno
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notas_soap_paciente_id
  ON notas_soap (paciente_id);

CREATE INDEX IF NOT EXISTS idx_notas_soap_medico_id
  ON notas_soap (medico_id);

CREATE INDEX IF NOT EXISTS idx_notas_soap_turno_id
  ON notas_soap (turno_id);

-- ══════════════════════════════════════════════════════════════════
-- 🚀 Para producción sin downtime, ejecutar cada uno por separado:
--
--   DESDE psql (conexión directa):
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_turnos_fecha_hora ON turnos (fecha_hora);
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_turnos_medico_fecha ON turnos (medico_id, fecha_hora);
--   ... y así sucesivamente.
--
--   DESDE bash script:
--   for idx in \
--     "idx_turnos_fecha_hora ON turnos (fecha_hora)" \
--     "idx_turnos_medico_fecha ON turnos (medico_id, fecha_hora)" \
--     ... ; do
--     echo "CREATE INDEX CONCURRENTLY IF NOT EXISTS $idx;" | psql -U dashboard_user -d consultorio_medico
--   done
-- ══════════════════════════════════════════════════════════════════
