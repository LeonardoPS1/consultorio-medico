-- 0049: Documentos Médicos (OCR por paciente)
CREATE TABLE IF NOT EXISTS documentos_medicos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id),
  medico_id         UUID REFERENCES medicos(id),
  turno_id          UUID REFERENCES turnos(id),
  tipo              VARCHAR(50) NOT NULL DEFAULT 'receta',
  archivo_url       TEXT NOT NULL,
  extraccion_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  datos_extraidos   JSONB DEFAULT '{}',
  confianza_extraccion INTEGER DEFAULT 0,
  estado_revision   VARCHAR(20) DEFAULT 'pendiente',
  revisado_por      UUID REFERENCES medicos(id),
  revisado_at       TIMESTAMPTZ,
  texto_original_ocr TEXT,
  historial_id      UUID REFERENCES historial_medico(id),
  metadata          JSONB DEFAULT '{}',
  tenant_id         UUID DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_documentos_paciente ON documentos_medicos(paciente_id);
CREATE INDEX idx_documentos_estado ON documentos_medicos(extraccion_estado);
CREATE INDEX idx_documentos_revision ON documentos_medicos(estado_revision);
CREATE INDEX idx_documentos_created_at ON documentos_medicos(created_at);
