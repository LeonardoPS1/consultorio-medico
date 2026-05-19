-- =============================================================================
-- Migration 008: Seguridad y Auditoría
--
-- 1. Tabla auditoria_accesos (pista de auditoría Ley 26.529)
-- 2. Columnas 2FA en usuarios
-- 3. Soft delete en tablas faltantes
-- 4. Índices para rendimiento
-- =============================================================================

BEGIN;

-- ─── 1. Tabla de auditoría de accesos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria_accesos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    usuario_email VARCHAR(255),
    usuario_nombre VARCHAR(255),
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    entidad_id VARCHAR(255),
    detalle TEXT,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auditoria_accesos IS 'Pista de auditoría para cumplimiento Ley 26.529 (Historia Clínica)';
COMMENT ON COLUMN auditoria_accesos.accion IS 'login, logout, view, create, edit, delete, export, config';
COMMENT ON COLUMN auditoria_accesos.entidad IS 'paciente, turno, receta, credencial, usuario, conversacion, etc.';

-- Índices para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria_accesos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_accesos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria_accesos(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria_accesos(entidad);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad_id ON auditoria_accesos(entidad_id);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION update_auditoria_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- auditoria_accesos es solo insert, no necesita updated_at
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Columnas 2FA en usuarios (idempotente) ─────────────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS secreto_2fa VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo_2fa BOOLEAN DEFAULT FALSE;

-- ─── 3. Soft delete en tablas faltantes ────────────────────────────────────

-- turnos: histórico de citas no debe eliminarse físicamente
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- historial_medico: datos clínicos, NUNCA borrar físicamente
ALTER TABLE historial_medico ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- recetas: prescripciones con validez legal
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- facturación: registros contables
ALTER TABLE facturacion ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- conversaciones y mensajes: trazabilidad de atención
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- tareas_pendientes: seguimiento de acciones
ALTER TABLE tareas_pendientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- bloqueos_agenda: disponibilidad histórica
ALTER TABLE bloqueos_agenda ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── 4. Índices para rendimiento ──────────────────────────────────────────

-- Índices en foreign keys más consultadas
CREATE INDEX IF NOT EXISTS idx_turnos_paciente_id ON turnos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_turnos_medico_id ON turnos(medico_id);
CREATE INDEX IF NOT EXISTS idx_historial_medico_paciente ON historial_medico(paciente_id);
CREATE INDEX IF NOT EXISTS idx_recetas_paciente_id ON recetas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_paciente_id ON conversaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_id ON mensajes(conversacion_id);

-- Índice compuesto para listado del dashboard (estado + última interacción)
CREATE INDEX IF NOT EXISTS idx_conversaciones_estado_ultima ON conversaciones(estado, ultima_interaccion DESC);

-- Índice GIN para búsqueda por tags en pacientes
CREATE INDEX IF NOT EXISTS idx_pacientes_tags ON pacientes USING GIN(tags);

-- Índice para recetas activas
CREATE INDEX IF NOT EXISTS idx_recetas_estado ON recetas(estado);

-- Índice para workflow_errors (pendientes de resolución)
CREATE INDEX IF NOT EXISTS idx_workflow_errors_resuelto ON workflow_errors(resuelto) WHERE resuelto = FALSE;

-- ─── 5. Constraints adicionales ────────────────────────────────────────────

-- UNIQUE en matrícula de médicos (cada matrícula debe ser única)
ALTER TABLE medicos ADD CONSTRAINT IF NOT EXISTS uq_medicos_matricula UNIQUE (matricula);

-- UNIQUE en número de afiliado por obra social
ALTER TABLE pacientes ADD CONSTRAINT IF NOT EXISTS uq_pacientes_afiliado_obra_social UNIQUE (numero_afiliado, obra_social);

-- CHECK en duración de turnos (mayor a 0)
ALTER TABLE turnos ADD CONSTRAINT IF NOT EXISTS chk_turnos_duracion CHECK (duracion_minutos > 0);

-- CHECK en montos de facturación (mayor a 0)
ALTER TABLE facturacion ADD CONSTRAINT IF NOT EXISTS chk_facturacion_monto CHECK (monto > 0);

COMMIT;
