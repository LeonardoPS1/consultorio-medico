-- ============================================================
-- MIGRATION 004: Historial Médico y Recetas
-- ============================================================

-- ============================================================
-- HISTORIAL MÉDICO
-- ============================================================
CREATE TABLE IF NOT EXISTS historial_medico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID REFERENCES medicos(id),
    turno_id UUID REFERENCES turnos(id),
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN (
            'consulta', 'control', 'estudio', 'resultado',
            'receta', 'internacion', 'cirugia', 'alergia',
            'vacuna', 'diagnostico', 'observacion'
        )),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    -- Diagnóstico (CIE-10 opcional)
    diagnostico_codigo VARCHAR(10),
    diagnostico_descripcion TEXT,
    -- Archivos adjuntos
    archivos JSONB DEFAULT '[]',
    -- Visibilidad
    visible_para_paciente BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECETAS
-- ============================================================
CREATE TABLE IF NOT EXISTS recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    turno_id UUID REFERENCES turnos(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa', 'vencida', 'cancelada', 'renovada')),
    medicamento VARCHAR(255) NOT NULL,
    presentacion VARCHAR(255),        -- Ej: "Comp. x 500mg"
    dosis VARCHAR(255) NOT NULL,       -- Ej: "1 comprimido"
    frecuencia VARCHAR(255) NOT NULL,  -- Ej: "cada 8 horas"
    duracion VARCHAR(255),             -- Ej: "7 días"
    cantidad_total VARCHAR(100),       -- Ej: "21 comprimidos"
    indicaciones TEXT,
    -- Vigencia
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    -- ¿Requiere autorización de obra social?
    requiere_autorizacion BOOLEAN DEFAULT FALSE,
    autorizacion_obra_social BOOLEAN DEFAULT FALSE,
    -- ¿Es renovación de una receta anterior?
    receta_anterior_id UUID REFERENCES recetas(id),
    -- Para enviar por WhatsApp
    pdf_generado BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    whatsapp_enviado BOOLEAN DEFAULT FALSE,
    whatsapp_enviado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FACTURACIÓN (simple)
-- ============================================================
CREATE TABLE IF NOT EXISTS facturacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    turno_id UUID REFERENCES turnos(id),
    servicio_id UUID REFERENCES servicios(id),
    tipo VARCHAR(20) NOT NULL DEFAULT 'consulta'
        CHECK (tipo IN ('consulta', 'estudio', 'procedimiento', 'otro')),
    monto DECIMAL(10, 2) NOT NULL,
    forma_pago VARCHAR(30) DEFAULT 'efectivo'
        CHECK (forma_pago IN ('efectivo', 'tarjeta', 'transferencia', 'obra_social', 'otro')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'pagada', 'anulada', 'pendiente_obra_social')),
    pagada_at TIMESTAMPTZ,
    observaciones TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER set_historial_updated_at
    BEFORE UPDATE ON historial_medico
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_recetas_updated_at
    BEFORE UPDATE ON recetas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_facturacion_updated_at
    BEFORE UPDATE ON facturacion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
