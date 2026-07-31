-- ============================================================
-- MIGRATION 0054: Fix CHECK constraint historial_medico.tipo
-- ============================================================
-- El CHECK constraint (migración 0022) solo permitía valores legacy:
--   consulta, control, estudio, resultado, receta, internacion,
--   cirugia, alergia, vacuna, diagnostico, observacion, certificado
-- Pero el schema actual inserta también:
--   urgencia, orden_estudio, derivacion, evolucion, anamnesis,
--   examen_fisico, tratamiento, encuesta, otro
-- (p.ej. 'otro' al aprobar documentos del portal, 'encuesta' al
-- guardar encuestas post-consulta).
-- Se dropea y recrea con la UNIÓN de ambos conjuntos para no romper
-- registros históricos.

ALTER TABLE historial_medico
    DROP CONSTRAINT IF EXISTS historial_medico_tipo_check;

ALTER TABLE historial_medico
    ADD CONSTRAINT historial_medico_tipo_check
        CHECK (tipo IN (
            'consulta', 'control', 'estudio', 'resultado',
            'receta', 'internacion', 'cirugia', 'alergia',
            'vacuna', 'diagnostico', 'observacion', 'certificado',
            'urgencia', 'orden_estudio', 'derivacion', 'evolucion',
            'anamnesis', 'examen_fisico', 'tratamiento', 'encuesta',
            'otro'
        ));
