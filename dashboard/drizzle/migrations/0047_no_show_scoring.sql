-- No-show scoring columns for turnos table
ALTER TABLE turnos ADD COLUMN risk_score DECIMAL(4,1);
ALTER TABLE turnos ADD COLUMN risk_nivel VARCHAR(10) CHECK (risk_nivel IN ('bajo','medio','alto'));
ALTER TABLE turnos ADD COLUMN recordatorio_48h_enviado BOOLEAN DEFAULT false;
ALTER TABLE turnos ADD COLUMN risk_calculated_at TIMESTAMPTZ;

-- Index for nightly job queries
CREATE INDEX idx_turnos_risk_nivel_fecha ON turnos (risk_nivel, fecha_hora) WHERE deleted_at IS NULL;