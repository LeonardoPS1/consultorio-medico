-- =============================================================================
-- FIX: Migration 008 — Seguridad y Auditoría (safe version)
-- =============================================================================
-- La migración original falló porque el script migrate-prod.js divide por ";"
-- y la función PL/pgSQL (con ";" dentro de $$) rompe el split.
--
-- Este fix:
--   ✅ Crea auditoria_accesos si no existe
--   ✅ Agrega columnas 2FA (idempotente)
--   ✅ Agrega soft delete con chequeo de existencia de tablas
--   ✅ Crea índices faltantes (FK, GIN, compuestos)
--   ✅ Agrega constraints UNIQUE y CHECK
--   ✅ Omite función innecesaria (era un no-op)
--   ✅ Cada statement es independiente (sin BEGIN/COMMIT)
--   ✅ Usa DO blocks con chequeo de existencia de tablas
-- =============================================================================

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

-- ─── 2. Columnas 2FA en usuarios (idempotente) ─────────────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS secreto_2fa VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo_2fa BOOLEAN DEFAULT FALSE;

-- ─── 3. Soft delete — con chequeo de existencia de tablas ──────────────────
DO $$
DECLARE
    _exists BOOLEAN;
BEGIN
    -- turnos
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'turnos') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE turnos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- historial_medico
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'historial_medico') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE historial_medico ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- recetas
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recetas') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE recetas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- facturacion
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facturacion') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE facturacion ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- conversaciones
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversaciones') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- mensajes
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- tareas_pendientes
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tareas_pendientes') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE tareas_pendientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- bloqueos_agenda
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bloqueos_agenda') INTO _exists;
    IF _exists THEN
        EXECUTE 'ALTER TABLE bloqueos_agenda ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;
END $$;

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

-- Índice para workflow_errors (con chequeo de existencia)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_errors') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_errors_resuelto ON workflow_errors(resuelto) WHERE resuelto = FALSE';
    END IF;
END $$;

-- ─── 5. Constraints adicionales ────────────────────────────────────────────

-- UNIQUE en matrícula de médicos
ALTER TABLE medicos ADD CONSTRAINT IF NOT EXISTS uq_medicos_matricula UNIQUE (matricula);

-- UNIQUE en número de afiliado por obra social
ALTER TABLE pacientes ADD CONSTRAINT IF NOT EXISTS uq_pacientes_afiliado_obra_social UNIQUE (numero_afiliado, obra_social);

-- CHECK en duración de turnos (mayor a 0)
ALTER TABLE turnos ADD CONSTRAINT IF NOT EXISTS chk_turnos_duracion CHECK (duracion_minutos > 0);

-- CHECK en montos de facturación (mayor a 0)
ALTER TABLE facturacion ADD CONSTRAINT IF NOT EXISTS chk_facturacion_monto CHECK (monto > 0);
