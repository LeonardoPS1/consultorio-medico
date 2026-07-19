-- Migration 0046: Fix tipo_consulta CHECK constraint
-- La columna tipo_consulta se creó como varchar(20) con DEFAULT 'presencial'
-- y luego se agregó un CHECK constraint que solo permitía los valores viejos
-- (presencial, telemedicina, telefonica). Ahora que el frontend envía
-- los valores normalizados del enum turno_tipo, el CHECK constraint rechaza
-- valores como 'consulta' o 'control'.

-- 1. Actualizar datos existentes con valores viejos a los nuevos
UPDATE turnos SET tipo_consulta = 'consulta' WHERE tipo_consulta IN ('presencial', 'telefonica');
UPDATE turnos SET tipo_consulta = 'telemedicina' WHERE tipo_consulta = 'virtual';

-- 2. Eliminar el CHECK constraint viejo (si existe)
ALTER TABLE turnos DROP CONSTRAINT IF EXISTS turnos_tipo_consulta_check;

-- 3. Agregar CHECK constraint con todos los valores válidos del enum turno_tipo
ALTER TABLE turnos ADD CONSTRAINT turnos_tipo_consulta_check
  CHECK (tipo_consulta IN ('consulta', 'control', 'urgencia', 'telemedicina', 'procedimiento', 'otro'));
