-- ============================================================
-- MIGRATION 006: Índices y Optimización
-- ============================================================

-- ============================================================
-- PACIENTES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pacientes_telefono ON pacientes(telefono);
CREATE INDEX IF NOT EXISTS idx_pacientes_email ON pacientes(email);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre, apellido);
CREATE INDEX IF NOT EXISTS idx_pacientes_dni ON pacientes(dni) WHERE dni IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pacientes_deleted ON pacientes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pacientes_created ON pacientes(created_at DESC);

-- ============================================================
-- TURNOS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_medico ON turnos(medico_id, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_turnos_paciente ON turnos(paciente_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_medico_estado ON turnos(medico_id, estado, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_turnos_recordatorio ON turnos(recordatorio_24h_enviado, recordatorio_1h_enviado)
    WHERE estado IN ('pendiente', 'confirmada');
CREATE INDEX IF NOT EXISTS idx_turnos_google_calendar ON turnos(google_calendar_event_id)
    WHERE google_calendar_event_id IS NOT NULL;

-- ============================================================
-- CONVERSACIONES Y MENSAJES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversaciones_paciente ON conversaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_estado ON conversaciones(estado);
CREATE INDEX IF NOT EXISTS idx_conversaciones_canal ON conversaciones(canal);
CREATE INDEX IF NOT EXISTS idx_conversaciones_ultima ON conversaciones(ultima_interaccion DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_opt_out ON conversaciones(opt_out) WHERE opt_out = TRUE;
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_created ON mensajes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_intencion ON mensajes(intencion);
CREATE INDEX IF NOT EXISTS idx_mensajes_twilio ON mensajes(twilio_sid) WHERE twilio_sid IS NOT NULL;

-- ============================================================
-- HISTORIAL Y RECETAS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_historial_paciente ON historial_medico(paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON historial_medico(tipo);
CREATE INDEX IF NOT EXISTS idx_recetas_paciente ON recetas(paciente_id, estado);
CREATE INDEX IF NOT EXISTS idx_recetas_activas ON recetas(estado) WHERE estado = 'activa';

-- ============================================================
-- FACTURACIÓN
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_facturacion_paciente ON facturacion(paciente_id);
CREATE INDEX IF NOT EXISTS idx_facturacion_estado ON facturacion(estado);
CREATE INDEX IF NOT EXISTS idx_facturacion_fecha ON facturacion(created_at DESC);

-- ============================================================
-- TAREAS PENDIENTES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tareas_pendientes_estado ON tareas_pendientes(estado, prioridad);
CREATE INDEX IF NOT EXISTS idx_tareas_asignadas ON tareas_pendientes(asignado_a, estado);

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Turnos del día (vista)
CREATE OR REPLACE VIEW turnos_del_dia AS
SELECT
    t.id,
    t.fecha_hora,
    t.estado,
    t.tipo_consulta,
    t.motivo,
    p.nombre || ' ' || p.apellido AS paciente_nombre,
    p.telefono AS paciente_telefono,
    p.email AS paciente_email,
    m.nombre AS medico_nombre,
    m.especialidad,
    t.duracion_minutos,
    t.confirmo_asistencia,
    t.notas_medico
FROM turnos t
JOIN pacientes p ON p.id = t.paciente_id
JOIN medicos m ON m.id = t.medico_id
WHERE DATE(t.fecha_hora AT TIME ZONE 'America/Argentina/Buenos_Aires') = CURRENT_DATE
ORDER BY t.fecha_hora;

-- Próximos turnos (vista)
CREATE OR REPLACE VIEW proximos_turnos AS
SELECT * FROM turnos_del_dia
WHERE estado IN ('pendiente', 'confirmada')
  AND fecha_hora >= NOW()
LIMIT 50;

-- Cantidad de mensajes por intención (últimos 30 días)
CREATE OR REPLACE VIEW metricas_intenciones AS
SELECT
    DATE(m.created_at) AS fecha,
    m.intencion,
    COUNT(*) AS cantidad
FROM mensajes m
WHERE m.created_at >= NOW() - INTERVAL '30 days'
  AND m.intencion IS NOT NULL
GROUP BY DATE(m.created_at), m.intencion
ORDER BY fecha DESC, cantidad DESC;

-- Pacientes nuevos por mes
CREATE OR REPLACE VIEW pacientes_nuevos_por_mes AS
SELECT
    DATE_TRUNC('month', created_at) AS mes,
    COUNT(*) AS cantidad
FROM pacientes
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;
