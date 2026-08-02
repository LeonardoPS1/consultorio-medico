-- Solicitudes de datos (Ley 19.628): exportaciones y solicitudes de eliminación
CREATE TABLE IF NOT EXISTS solicitudes_datos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  tipo varchar(20) NOT NULL,
  estado varchar(20) NOT NULL DEFAULT 'pendiente',
  tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_datos_paciente ON solicitudes_datos (paciente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_datos_tipo ON solicitudes_datos (tipo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_datos_tenant ON solicitudes_datos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_datos_estado ON solicitudes_datos (estado);
