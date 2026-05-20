-- ============================================================
-- MIGRATION 005: Logs y Auditoría
-- ============================================================

-- ============================================================
-- LOGS DE WORKFLOWS n8n
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL,
    workflow_name VARCHAR(255),
    execution_id VARCHAR(255),
    nivel VARCHAR(10) NOT NULL DEFAULT 'info'
        CHECK (nivel IN ('info', 'warn', 'error', 'debug')),
    mensaje TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ERRORES DE WORKFLOWS n8n
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255),
    nodo VARCHAR(255),
    codigo VARCHAR(50),
    mensaje_error TEXT,
    detalle JSONB,
    resuelto BOOLEAN DEFAULT FALSE,
    resuelto_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOGS DE WHATSAPP (status callbacks de Twilio)
-- ============================================================
CREATE TABLE IF NOT EXISTS twilio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensaje_id UUID REFERENCES mensajes(id),
    twilio_sid VARCHAR(255) NOT NULL,
    evento VARCHAR(50) NOT NULL,
        -- Valores: sent, delivered, failed, read, undelivered, queued
    codigo_error VARCHAR(10),
    mensaje_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOGS DE CONSULTAS A IA (Ollama)
-- ============================================================
CREATE TABLE IF NOT EXISTS ia_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN ('clasificacion', 'respuesta', 'extraccion', 'sql', 'triaje')),
    prompt_hash VARCHAR(64),       -- Para cachear respuestas repetidas
    prompt_truncado TEXT,
    respuesta_truncada TEXT,
    tokens_input INTEGER,
    tokens_output INTEGER,
    latencia_ms INTEGER,
    modelo VARCHAR(50) DEFAULT 'mistral',
    temperatura DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDITORÍA DE ACCIONES EN EL DASHBOARD
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,   -- turnos, pacientes, etc
    entidad_id UUID,
    detalle JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para logs (por performance)
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created ON workflow_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_errors_created ON workflow_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_logs_tipo ON ia_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_ia_logs_created ON ia_logs(created_at DESC);
