-- Migration 0014: Lista de Espera + Ofertas de Turno
-- Permite reasignar turnos cancelados a pacientes en espera
-- Creado: 28/05/2026

-- ============================================================
-- TABLA: lista_espera
-- ============================================================
CREATE TABLE IF NOT EXISTS lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado VARCHAR(20) NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'expirada', 'cumplida', 'cancelada')),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para lista_espera
CREATE INDEX IF NOT EXISTS idx_lista_espera_paciente ON lista_espera(paciente_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_medico ON lista_espera(medico_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_estado ON lista_espera(estado);

-- ============================================================
-- TABLA: ofertas_turno
-- ============================================================
CREATE TABLE IF NOT EXISTS ofertas_turno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_espera_id UUID NOT NULL REFERENCES lista_espera(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  fecha_oferta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiracion TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'expirada')),
  notificada BOOLEAN NOT NULL DEFAULT false,
  notificada_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ofertas_turno
CREATE INDEX IF NOT EXISTS idx_ofertas_lista_espera ON ofertas_turno(lista_espera_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_turno ON ofertas_turno(turno_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_estado ON ofertas_turno(estado);
CREATE INDEX IF NOT EXISTS idx_ofertas_expiracion ON ofertas_turno(expiracion);

-- ============================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_lista_espera_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ofertas_turno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lista_espera_updated_at ON lista_espera;
CREATE TRIGGER trg_lista_espera_updated_at
  BEFORE UPDATE ON lista_espera
  FOR EACH ROW
  EXECUTE FUNCTION update_lista_espera_updated_at();

DROP TRIGGER IF EXISTS trg_ofertas_turno_updated_at ON ofertas_turno;
CREATE TRIGGER trg_ofertas_turno_updated_at
  BEFORE UPDATE ON ofertas_turno
  FOR EACH ROW
  EXECUTE FUNCTION update_ofertas_turno_updated_at();
