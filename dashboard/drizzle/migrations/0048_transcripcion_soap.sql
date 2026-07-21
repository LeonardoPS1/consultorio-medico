-- 0048: Transcripción automática + SOAP por IA
-- Agrega columnas a notas_soap para el pipeline de transcripción
-- Extiende config_ia con settings de grabación

ALTER TABLE notas_soap
ADD COLUMN IF NOT EXISTS ia_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_ia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS estado_revision varchar(20) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS transcripcion_texto text;

CREATE INDEX IF NOT EXISTS idx_notas_soap_estado_revision ON notas_soap(estado_revision);

-- Extender config_ia en todos los tenants existentes
UPDATE tenants
SET config_ia = COALESCE(config_ia, '{}'::jsonb) || jsonb_build_object(
  'transcripcionHabilitada', false,
  'retencionAudioHoras', 0
)
WHERE config_ia IS NULL
   OR NOT (config_ia ? 'transcripcionHabilitada');
