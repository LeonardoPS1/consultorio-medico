-- Migration 0033: Agregar config_ia JSONB a la tabla tenants
-- Almacena la configuración del asistente IA (prompt, tokens, temperatura)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS config_ia JSONB DEFAULT '{"prompt": "Sos el asistente virtual del consultorio médico. Respondés mensajes de WhatsApp de forma amable y profesional en español neutro chileno. Si detectás una urgencia, priorizala y notificá al médico.", "maxTokens": 300, "temperatura": 0.3}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tenants_config_ia ON tenants (config_ia);
