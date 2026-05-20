-- ============================================================
-- MIGRATION 001: Core
-- Tablas fundamentales: usuarios, medicos, pacientes
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USUARIOS (acceso al dashboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'medico'
        CHECK (rol IN ('admin', 'medico', 'secretaria', 'recepcionista')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- MEDICOS
-- ============================================================
CREATE TABLE IF NOT EXISTS medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    whatsapp VARCHAR(20),
    matricula VARCHAR(50),
    -- Horarios de atención semanal en JSON
    -- Ej: {"lunes": [{"inicio": "09:00", "fin": "13:00"}, {"inicio": "15:00", "fin": "18:00"}], ...}
    horarios JSONB DEFAULT '{}',
    duracion_turno_minutos INTEGER NOT NULL DEFAULT 30,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    color_evento VARCHAR(7) DEFAULT '#3B82F6', -- Para calendario
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- PACIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    dni VARCHAR(20),
    fecha_nacimiento DATE,
    direccion TEXT,
    obra_social VARCHAR(255),
    numero_afiliado VARCHAR(100),
    alergias TEXT,
    medicacion_cronica TEXT,
    notas_medicas TEXT,
    -- Cómo prefiere contactarse
    canal_preferido VARCHAR(20) DEFAULT 'whatsapp'
        CHECK (canal_preferido IN ('whatsapp', 'sms', 'email', 'telefono')),
    -- Consentimiento informado
    consentimiento_whatsapp BOOLEAN DEFAULT FALSE,
    consentimiento_email BOOLEAN DEFAULT FALSE,
    -- Origen del paciente
    fuente VARCHAR(50) DEFAULT 'whatsapp',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- HISTORIAL DE CONTACTO DEL PACIENTE (eventos de comunicación)
-- ============================================================
CREATE TABLE IF NOT EXISTS paciente_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN ('whatsapp_enviado', 'whatsapp_recibido', 'email_enviado',
                         'email_recibido', 'llamada', 'recordatorio',
                         'opt_in', 'opt_out', 'baja', 'reingreso')),
    descripcion TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at en usuarios
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_medicos_updated_at
    BEFORE UPDATE ON medicos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_pacientes_updated_at
    BEFORE UPDATE ON pacientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
