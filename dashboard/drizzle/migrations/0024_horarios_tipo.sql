-- Migration 0024: Agregar tipo de horario (corrido/partido) y segundo bloque
ALTER TABLE horarios_atencion 
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'corrido',
  ADD COLUMN IF NOT EXISTS inicio2 VARCHAR(5),
  ADD COLUMN IF NOT EXISTS fin2 VARCHAR(5);
