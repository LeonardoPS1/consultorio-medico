-- Migration 012: Features pendientes (horarios, notificaciones, plantillas)

-- ============================================================
-- 1. HORARIOS DE ATENCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS horarios_atencion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT true,
    inicio VARCHAR(5) NOT NULL DEFAULT '09:00',
    fin VARCHAR(5) NOT NULL DEFAULT '18:00',
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar defaults si la tabla está vacía
INSERT INTO horarios_atencion (dia, activo, inicio, fin)
SELECT * FROM (VALUES
    ('Lunes', true, '09:00', '18:00'),
    ('Martes', true, '09:00', '18:00'),
    ('Miércoles', true, '09:00', '18:00'),
    ('Jueves', true, '09:00', '18:00'),
    ('Viernes', true, '09:00', '18:00'),
    ('Sábado', false, '09:00', '13:00'),
    ('Domingo', false, '09:00', '13:00')
) AS v(dia, activo, inicio, fin)
WHERE NOT EXISTS (SELECT 1 FROM horarios_atencion LIMIT 1);

-- ============================================================
-- 2. PREFERENCIAS DE NOTIFICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS preferencias_notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    urgencias_whatsapp BOOLEAN NOT NULL DEFAULT true,
    resumen_diario_email BOOLEAN NOT NULL DEFAULT true,
    alertas_ausentismo BOOLEAN NOT NULL DEFAULT true,
    nuevos_pacientes BOOLEAN NOT NULL DEFAULT false,
    whatsapp_personal VARCHAR(20) DEFAULT '',
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferencias_usuario ON preferencias_notificaciones(usuario_id);

-- ============================================================
-- 3. PLANTILLAS DE MENSAJES (internas, separadas de Twilio)
-- ============================================================
CREATE TABLE IF NOT EXISTS plantillas_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'recordatorios',
    variables TEXT[] DEFAULT '{}',
    activa BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plantillas_mensajes_categoria ON plantillas_mensajes(categoria);

-- Insertar plantillas default si la tabla está vacía
INSERT INTO plantillas_mensajes (nombre, contenido, categoria, variables)
SELECT * FROM (VALUES
    ('Recordatorio 24hs', 'Hola {{paciente}}, te recordamos que tenés un turno con el Dr. {{medico}} mañana a las {{hora}}. Respondé "CONFIRMAR" para confirmar asistencia o "CANCELAR" si necesitás reprogramar.', 'recordatorios', ARRAY['paciente', 'medico', 'hora']),
    ('Recordatorio 1h', 'Recordatorio: {{paciente}}, tu turno con el Dr. {{medico}} es en 1 hora ({{hora}}). Te esperamos!', 'recordatorios', ARRAY['paciente', 'medico', 'hora']),
    ('Confirmación turno', '¡Gracias {{paciente}}! Tu turno con el Dr. {{medico}} el día {{fecha}} a las {{hora}} fue confirmado. Cualquier cambio nos avisás.', 'turnos', ARRAY['paciente', 'medico', 'fecha', 'hora']),
    ('Cancelación turno', 'Hola {{paciente}}, te confirmamos que tu turno del {{fecha}} a las {{hora}} fue cancelado. Si querés agendar un nuevo turno, escribinos.', 'turnos', ARRAY['paciente', 'fecha', 'hora']),
    ('Receta lista', '{{paciente}}, tu receta de {{medicamento}} ya está lista. Pasá a retirarla por el consultorio o decinos si querés que te la enviemos por WhatsApp.', 'recetas', ARRAY['paciente', 'medicamento']),
    ('Urgencia detectada', '⚠️ Alerta de urgencia: {{paciente}} reportó: "{{mensaje}}". Comunicarse a la brevedad.', 'alertas', ARRAY['paciente', 'mensaje'])
) AS v(nombre, contenido, categoria, variables)
WHERE NOT EXISTS (SELECT 1 FROM plantillas_mensajes LIMIT 1);
