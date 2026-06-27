-- 0043: Extender config_ia con settings del asistente IA flotante
-- Agrega campos de configuración del asistente flotante al JSONB config_ia existente

-- Backfill: agregar campos nuevos a los tenants existentes que ya tienen config_ia
UPDATE tenants
SET config_ia = COALESCE(config_ia, '{}'::jsonb) || jsonb_build_object(
  'asistenteHabilitado', true,
  'modoDefault', 'silencioso',
  'sugerenciasHabilitadas', jsonb_build_object(
    'conversaciones', true,
    'pacientes', true,
    'turnos', true,
    'recetas', true
  ),
  'promptAsistente', 'Sos el asistente IA del consultorio médico. Ayudás al médico con información rápida, sugerencias de respuestas para pacientes, resúmenes de historiales y recordatorios de turnos. Respondés en español neutro chileno, de forma concisa y profesional. Si no sabés algo, decilo honestamente. Nunca inventes datos médicos.',
  'maxTokensAsistente', 400,
  'temperaturaAsistente', 0.3
)
WHERE config_ia IS NULL
   OR NOT (config_ia ? 'asistenteHabilitado');

-- Verificar resultado
SELECT id, config_ia->'asistenteHabilitado' as asistente_habilitado, config_ia->'modoDefault' as modo_default
FROM tenants
LIMIT 5;
