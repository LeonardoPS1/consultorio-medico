-- Migration 0023: Agregar columna isapre_nombre para Chile
-- Cuando sistema_salud = 'isapre', guarda el nombre de la Isapre seleccionada

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS isapre_nombre VARCHAR(100);
