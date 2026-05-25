-- ============================================================
-- Migration 0007: Chilean Adaptation
-- Agrega columnas para adaptar pacientes a Chile:
--  - rut: RUT chileno con dígito verificador
--  - sistema_salud: FONASA / ISAPRE / Particular
--  - region / comuna: Geografía chilena (16 regiones)
-- ============================================================
-- Uso: cat 0007_chile_adaptation.sql | docker exec -i postgres psql -U dashboard_user -d consultorio_medico

-- 1. Agregar rut a pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS rut VARCHAR(20);

-- 2. Agregar sistema_salud (reemplazo moderno de obra_social para Chile)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS sistema_salud VARCHAR(20);

-- 3. Agregar región y comuna chilenas
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS comuna VARCHAR(100);

-- 4. Agregar rut a médicos también (para facturación chilena)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS rut VARCHAR(20);

-- 5. Índices para búsqueda por RUT
CREATE INDEX IF NOT EXISTS idx_pacientes_rut ON pacientes(rut);
CREATE INDEX IF NOT EXISTS idx_pacientes_sistema_salud ON pacientes(sistema_salud);
CREATE INDEX IF NOT EXISTS idx_pacientes_region ON pacientes(region);

-- 6. Comentarios
COMMENT ON COLUMN pacientes.rut IS 'RUT chileno. Formato: 12.345.678-5';
COMMENT ON COLUMN pacientes.sistema_salud IS 'Sistema de salud chileno: fonasa, isapre, particular, particular_convenio';
COMMENT ON COLUMN pacientes.region IS 'Región de Chile (1-16 o nombre)';
COMMENT ON COLUMN pacientes.comuna IS 'Comuna chilena';
COMMENT ON COLUMN medicos.rut IS 'RUT chileno del médico';
