-- Migration 0029: Derivaciones (interconsultas entre médicos)
-- Permite derivar pacientes a otros especialistas con seguimiento de estado

CREATE TABLE IF NOT EXISTS derivaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_origen_id UUID NOT NULL REFERENCES medicos(id),
    medico_destino_id UUID REFERENCES medicos(id),
    especialidad VARCHAR(100) NOT NULL,
    motivo TEXT NOT NULL,
    diagnostico TEXT,
    cie10_codigo VARCHAR(10),
    gravedad VARCHAR(20) NOT NULL DEFAULT 'normal',
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    notas_origen TEXT,
    notas_destino TEXT,
    fecha_respuesta TIMESTAMPTZ,
    sucursal_id UUID REFERENCES sucursales(id),
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_derivaciones_paciente
    ON derivaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_derivaciones_estado
    ON derivaciones(estado);
CREATE INDEX IF NOT EXISTS idx_derivaciones_medico_origen
    ON derivaciones(medico_origen_id);
CREATE INDEX IF NOT EXISTS idx_derivaciones_medico_destino
    ON derivaciones(medico_destino_id);
CREATE INDEX IF NOT EXISTS idx_derivaciones_created_at
    ON derivaciones(created_at);
