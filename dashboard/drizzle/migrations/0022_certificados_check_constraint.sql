-- ============================================================
-- MIGRATION 0022: Fix CHECK constraint historial_medico.tipo
-- ============================================================
-- El CHECK constraint existente no incluye 'certificado'.
-- Se dropea y recrea con el nuevo valor.

ALTER TABLE historial_medico
    DROP CONSTRAINT IF EXISTS historial_medico_tipo_check;

ALTER TABLE historial_medico
    ADD CONSTRAINT historial_medico_tipo_check
        CHECK (tipo IN (
            'consulta', 'control', 'estudio', 'resultado',
            'receta', 'internacion', 'cirugia', 'alergia',
            'vacuna', 'diagnostico', 'observacion', 'certificado'
        ));
