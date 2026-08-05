-- IA Clínica: CIE-10 sugerido + Resumen longitudinal
-- T1: sugerencia automática de código CIE-10 al generar nota SOAP por IA
ALTER TABLE notas_soap ADD COLUMN IF NOT EXISTS cie10_sugerido jsonb;

-- T2: resumen longitudinal del paciente, cacheado por paciente
CREATE TABLE IF NOT EXISTS resumenes_paciente (
  paciente_id uuid PRIMARY KEY REFERENCES pacientes(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  generado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumenes_paciente_paciente_id
  ON resumenes_paciente (paciente_id);