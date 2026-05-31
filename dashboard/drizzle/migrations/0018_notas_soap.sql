-- Migration 0018: Notas SOAP (Evolución Clínica Estructurada)
-- Crea tabla notas_soap con estructura SOAP + CIE-10

CREATE TABLE IF NOT EXISTS notas_soap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  subjetivo TEXT,
  objetivo TEXT,
  assessment TEXT,
  plan TEXT,
  cie10_codigo VARCHAR(10),
  cie10_descripcion TEXT,
  derivar_a VARCHAR(255),
  requiere_control BOOLEAN DEFAULT FALSE,
  control_en_dias INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_notas_soap_paciente_id ON notas_soap(paciente_id);
CREATE INDEX IF NOT EXISTS idx_notas_soap_medico_id ON notas_soap(medico_id);
CREATE INDEX IF NOT EXISTS idx_notas_soap_turno_id ON notas_soap(turno_id);
CREATE INDEX IF NOT EXISTS idx_notas_soap_created_at ON notas_soap(created_at DESC);

-- Permisos para dashboard_user
GRANT ALL PRIVILEGES ON TABLE notas_soap TO dashboard_user;
