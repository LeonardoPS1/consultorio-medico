-- ============================================================
-- MIGRATION 003: Conversaciones y Mensajes
-- ============================================================

-- ============================================================
-- CONVERSACIONES (sesiones de chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID REFERENCES medicos(id),
    canal VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
        CHECK (canal IN ('whatsapp', 'sms', 'email', 'web')),
    estado VARCHAR(20) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa', 'pendiente', 'cerrada', 'derivada')),
    -- El paciente optó out?
    opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    opt_out_at TIMESTAMPTZ,
    ultimo_mensaje TEXT,
    ultimo_mensaje_rol VARCHAR(20),
    ultima_intencion VARCHAR(30),
    ultima_interaccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Contexto de IA (para mantener estado entre mensajes)
    contexto_ia JSONB DEFAULT '{}',
    -- Cuenta regresiva para recordatorio
    proximo_recordatorio TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MENSAJES individuales
-- ============================================================
CREATE TABLE IF NOT EXISTS mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID NOT NULL REFERENCES conversaciones(id),
    rol VARCHAR(20) NOT NULL
        CHECK (rol IN ('paciente', 'asistente_ia', 'medico', 'secretaria', 'sistema')),
    contenido TEXT NOT NULL,
    contenido_procesado TEXT,   -- Versión limpia para IA
    tipo VARCHAR(20) NOT NULL DEFAULT 'texto'
        CHECK (tipo IN ('texto', 'imagen', 'audio', 'video', 'documento', 'ubicacion', 'template')),
    intencion VARCHAR(30),      -- Clasificada por Ollama
        -- Valores: consulta, turno_nuevo, turno_cancelar, turno_confirmar,
        --          receta, urgencia, reclamo, informacion, saludo, otro
    confianza_intencion DECIMAL(4,3),  -- Score de 0 a 1
    -- IDs de integración
    twilio_sid VARCHAR(255),
    twilio_status VARCHAR(50),
    n8n_execution_id VARCHAR(255),
    -- Para templates de WhatsApp
    template_name VARCHAR(100),
    template_params JSONB,
    -- Facturación (contar mensajes)
    costo DECIMAL(10, 6),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLANTILLAS DE WHATSAPP (templates aprobados)
-- ============================================================
CREATE TABLE IF NOT EXISTS plantillas_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    idioma VARCHAR(10) NOT NULL DEFAULT 'es',
    categoria VARCHAR(30) NOT NULL
        CHECK (categoria IN ('marketing', 'utilidad', 'autenticacion')),
    contenido TEXT NOT NULL,
    variables TEXT[],            -- Nombres de las variables {{1}}, {{2}}
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'pausado')),
    twilio_template_sid VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TO-DO / TAREAS PENDIENTES DE SEGUIMIENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS tareas_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID REFERENCES medicos(id),
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN ('pendiente_revisar', 'llamar_paciente', 'receta_autorizar',
                         'seguimiento', 'derivar', 'otro')),
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'normal'
        CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    asignado_a UUID REFERENCES usuarios(id),
    fecha_limite TIMESTAMPTZ,
    completada_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER set_conversaciones_updated_at
    BEFORE UPDATE ON conversaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_plantillas_updated_at
    BEFORE UPDATE ON plantillas_whatsapp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_tareas_updated_at
    BEFORE UPDATE ON tareas_pendientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
