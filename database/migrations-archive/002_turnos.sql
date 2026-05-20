-- ============================================================
-- MIGRATION 002: Turnos (Appointments)
-- ============================================================

-- ============================================================
-- TURNOS
-- ============================================================
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    fecha_hora TIMESTAMPTZ NOT NULL,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    motivo TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN (
            'pendiente',       -- Creado, sin confirmar
            'confirmada',      -- Confirmado por el paciente
            'en_consulta',     -- El médico lo está atendiendo
            'completada',      -- Atendido exitosamente
            'cancelada',       -- Cancelado por paciente o médico
            'no_asistio'       -- Paciente no se presentó
        )),
    tipo_consulta VARCHAR(20) NOT NULL DEFAULT 'presencial'
        CHECK (tipo_consulta IN ('presencial', 'virtual', 'domicilio')),
    -- Para teleconsulta: link de videollamada
    link_videollamada TEXT,
    notas_paciente TEXT,       -- Lo que dijo el paciente al pedir turno
    notas_medico TEXT,         -- Notas post-consulta del médico
    -- Recordatorios
    recordatorio_24h_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    recordatorio_1h_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    recordatorio_24h_leido BOOLEAN DEFAULT FALSE,
    recordatorio_1h_leido BOOLEAN DEFAULT FALSE,
    -- El paciente confirmó el recordatorio?
    confirmo_asistencia BOOLEAN DEFAULT FALSE,
    -- Fuente del turno
    fuente VARCHAR(20) DEFAULT 'whatsapp'
        CHECK (fuente IN ('whatsapp', 'web', 'telefono', 'presencial', 'email')),
    -- Quién lo creó
    creado_por UUID REFERENCES usuarios(id),
    cancelado_por VARCHAR(20),
    motivo_cancelacion TEXT,
    -- IDs de integración
    google_calendar_event_id VARCHAR(500),
    n8n_workflow_execution_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICIOS / PRESTACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    precio DECIMAL(10, 2),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BLOQUEOS DE AGENDA (vacaciones, feriados, etc)
-- ============================================================
CREATE TABLE IF NOT EXISTS bloqueos_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    titulo VARCHAR(255) NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'bloqueo'
        CHECK (tipo IN ('bloqueo', 'vacaciones', 'feriado', 'capacitacion')),
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER set_turnos_updated_at
    BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_servicios_updated_at
    BEFORE UPDATE ON servicios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
