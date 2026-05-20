-- ============================================================
-- seed_data_n8n.sql — Datos de prueba para workflows n8n
-- ============================================================
-- Este script genera datos de ejemplo para que todos los
-- 7 workflows de n8n tengan datos reales con los que trabajar.
--
-- ES IDEMPOTENTE: se puede ejecutar múltiples veces.
-- ============================================================

-- ─── 1. Asegurar médico seed (si no se creó en 0003) ─────────
DO $$
DECLARE
  medico_user_id UUID;
  medico_count INT;
BEGIN
  SELECT COUNT(*) INTO medico_count FROM medicos;

  IF medico_count = 0 THEN
    -- Crear usuario médico si no existe ya el usuario
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'medico@consultorio.com') THEN
      INSERT INTO usuarios (id, email, password_hash, nombre, rol, activo, tenant_id, plan, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'medico@consultorio.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'Dr. Rodríguez',
        'medico',
        true,
        '00000000-0000-0000-0000-000000000000',
        'professional',
        NOW(),
        NOW()
      );
    END IF;

    SELECT id INTO medico_user_id FROM usuarios WHERE email = 'medico@consultorio.com';

    -- Crear médicos de prueba
    INSERT INTO medicos (id, usuario_id, nombre, especialidad, email, telefono, whatsapp, activo, tenant_id, created_at, updated_at)
    VALUES
      (gen_random_uuid(), medico_user_id, 'Dr. Rodríguez', 'Medicina General', 'medico@consultorio.com', '+5491155550000', '+5491155550000', true, '00000000-0000-0000-0000-000000000000', NOW(), NOW());

    RAISE NOTICE '✅ Médico creado: Dr. Rodríguez';
  ELSE
    RAISE NOTICE '⏭️ Médicos ya existen (% registros)', medico_count;
  END IF;
END $$;

-- ─── 2. Pacientes de prueba ──────────────────────────────────
INSERT INTO pacientes (id, telefono, nombre, apellido, email, dni, fecha_nacimiento, obra_social, canal_preferido, consentimiento_whatsapp, consentimiento_email, fuente, tags, created_at, updated_at)
SELECT * FROM (VALUES
    (gen_random_uuid(), '+5491155550101', 'Juan', 'Pérez', 'juan@test.com', '30123456', '1985-03-15', 'OSDE', 'whatsapp', true, false, 'whatsapp', ARRAY['paciente', 'cronico'], NOW() - INTERVAL '30 days', NOW()),
    (gen_random_uuid(), '+5491155550102', 'María', 'García', 'maria@test.com', '28456789', '1990-07-22', 'Particular', 'whatsapp', true, false, 'whatsapp', ARRAY['paciente'], NOW() - INTERVAL '20 days', NOW()),
    (gen_random_uuid(), '+5491155550103', 'Pedro', 'Sánchez', 'pedro@test.com', '35678901', '1978-11-08', 'Swiss Medical', 'whatsapp', true, true, 'web', ARRAY['paciente'], NOW() - INTERVAL '15 days', NOW()),
    (gen_random_uuid(), '+5491155550104', 'Ana', 'López', 'ana@test.com', '27890123', '1995-01-30', 'Particular', 'whatsapp', true, false, 'whatsapp', ARRAY['paciente'], NOW() - INTERVAL '10 days', NOW()),
    (gen_random_uuid(), '+5491155550105', 'Carlos', 'Ruiz', 'carlos@test.com', '32901234', '1965-09-14', 'Galeno', 'whatsapp', true, false, 'whatsapp', ARRAY['paciente', 'urgencia'], NOW() - INTERVAL '5 days', NOW())
) AS v(id, telefono, nombre, apellido, email, dni, fecha_nacimiento, obra_social, canal_preferido, consentimiento_whatsapp, consentimiento_email, fuente, tags, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE telefono = '+5491155550101')
ON CONFLICT (telefono) DO NOTHING;

RAISE NOTICE '✅ 5 pacientes de prueba insertados';

-- ─── 3. Turnos de prueba ─────────────────────────────────────
DO $$
DECLARE
    pac1 UUID; pac2 UUID; pac3 UUID; med_id UUID;
    tomorrow DATE := CURRENT_DATE + 1;
BEGIN
    SELECT id INTO pac1 FROM pacientes WHERE telefono = '+5491155550101';
    SELECT id INTO pac2 FROM pacientes WHERE telefono = '+5491155550102';
    SELECT id INTO pac3 FROM pacientes WHERE telefono = '+5491155550103';
    SELECT id INTO med_id FROM medicos WHERE email = 'medico@consultorio.com' ORDER BY created_at ASC LIMIT 1;

    -- Solo insertar si no hay turnos en los próximos 7 días
    IF NOT EXISTS (SELECT 1 FROM turnos WHERE fecha_hora >= CURRENT_DATE AND fecha_hora < CURRENT_DATE + INTERVAL '7 days' LIMIT 1) THEN
        INSERT INTO turnos (id, paciente_id, medico_id, fecha_hora, duracion_minutos, motivo, estado, tipo_consulta, fuente, notas_paciente, created_at, updated_at)
        VALUES
            (gen_random_uuid(), pac1, med_id, tomorrow + TIME '09:00', 30, 'Control general', 'confirmada', 'presencial', 'whatsapp', 'Primera consulta del mes', NOW(), NOW()),
            (gen_random_uuid(), pac2, med_id, tomorrow + TIME '10:30', 30, 'Revisión resultados', 'confirmada', 'presencial', 'whatsapp', 'Traer estudios', NOW(), NOW()),
            (gen_random_uuid(), pac3, med_id, tomorrow + TIME '11:00', 30, 'Consulta dolor rodilla', 'pendiente', 'presencial', 'web', '', NOW(), NOW()),
            (gen_random_uuid(), pac1, med_id, CURRENT_DATE + TIME '15:00', 30, 'Seguimiento', 'pendiente', 'virtual', 'whatsapp', 'Videollamada', NOW(), NOW()),
            (gen_random_uuid(), pac2, med_id, CURRENT_DATE + TIME '12:00', 30, 'Receta controlada', 'confirmada', 'presencial', 'whatsapp', '', NOW(), NOW());

        RAISE NOTICE '✅ 5 turnos de prueba para mañana/hoy insertados';
    ELSE
        RAISE NOTICE '⏭️ Ya hay turnos próximos';
    END IF;
END $$;

-- ─── 4. Conversaciones activas de prueba ─────────────────────
DO $$
DECLARE
    pac1 UUID; pac2 UUID;
BEGIN
    SELECT id INTO pac1 FROM pacientes WHERE telefono = '+5491155550101';
    SELECT id INTO pac2 FROM pacientes WHERE telefono = '+5491155550102';

    IF NOT EXISTS (SELECT 1 FROM conversaciones WHERE estado = 'activa' AND paciente_id = pac1 LIMIT 1) THEN
        INSERT INTO conversaciones (id, paciente_id, canal, estado, opt_out, ultimo_mensaje, ultimo_mensaje_rol, ultima_intencion, ultima_interaccion, contexto_ia, metadata, created_at, updated_at)
        VALUES
            (gen_random_uuid(), pac1, 'whatsapp', 'activa', false, 'Gracias, confirmo!', 'paciente', 'confirmacion', NOW(), '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '2 hours', NOW()),
            (gen_random_uuid(), pac2, 'whatsapp', 'activa', false, 'Necesito renovar la receta de enalapril', 'paciente', 'receta', NOW() - INTERVAL '1 hour', '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '3 hours', NOW());

        -- Insertar mensajes para esas conversaciones
        INSERT INTO mensajes (id, conversacion_id, rol, contenido, tipo, created_at)
        SELECT
            gen_random_uuid(), c.id, 'paciente', c.ultimo_mensaje, 'texto', c.ultima_interaccion
        FROM conversaciones c
        WHERE c.estado = 'activa';

        RAISE NOTICE '✅ 2 conversaciones activas de prueba creadas';
    ELSE
        RAISE NOTICE '⏭️ Ya hay conversaciones activas';
    END IF;
END $$;

-- ─── 5. Recetas de prueba ────────────────────────────────────
DO $$
DECLARE
    pac1 UUID; med_id UUID;
BEGIN
    SELECT id INTO pac1 FROM pacientes WHERE telefono = '+5491155550101';
    SELECT id INTO med_id FROM medicos WHERE email = 'medico@consultorio.com' ORDER BY created_at ASC LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM recetas WHERE estado = 'activa' AND paciente_id = pac1 LIMIT 1) THEN
        INSERT INTO recetas (id, paciente_id, medico_id, medicamento, dosis, frecuencia, duracion, indicaciones, estado, created_at, updated_at)
        VALUES
            (gen_random_uuid(), pac1, med_id, 'Enalapril', '10mg', 'Cada 12 horas', '30 días', 'Tomar con comida. Controlar presión.', 'activa', NOW() - INTERVAL '5 days', NOW()),
            (gen_random_uuid(), pac1, med_id, 'Ibuprofeno', '400mg', 'Cada 8 horas', '7 días', 'Solo si hay dolor. No exceder dosis.', 'activa', NOW() - INTERVAL '2 days', NOW());

        RAISE NOTICE '✅ 2 recetas activas de prueba creadas';
    ELSE
        RAISE NOTICE '⏭️ Ya hay recetas activas';
    END IF;
END $$;

-- ─── 6. Eventos de pacientes ─────────────────────────────────
DO $$
DECLARE
    pac1 UUID; pac2 UUID;
BEGIN
    SELECT id INTO pac1 FROM pacientes WHERE telefono = '+5491155550101';
    SELECT id INTO pac2 FROM pacientes WHERE telefono = '+5491155550102';

    IF NOT EXISTS (SELECT 1 FROM paciente_eventos LIMIT 1) THEN
        INSERT INTO paciente_eventos (id, paciente_id, tipo, descripcion, created_at)
        VALUES
            (gen_random_uuid(), pac1, 'confirmacion', 'Juan Pérez confirmó turno para mañana', NOW() - INTERVAL '2 hours'),
            (gen_random_uuid(), pac2, 'consulta', 'María García preguntó por resultados de laboratorio', NOW() - INTERVAL '1 hour'),
            (gen_random_uuid(), pac1, 'nuevo', 'Nuevo paciente registrado: Juan Pérez', NOW() - INTERVAL '30 days');

        RAISE NOTICE '✅ 3 eventos de pacientes creados';
    ELSE
        RAISE NOTICE '⏭️ Ya hay eventos de pacientes';
    END IF;
END $$;

RAISE NOTICE '';
RAISE NOTICE '✅ Seed data para n8n completado exitosamente';
RAISE NOTICE '   - Médicos: OK';
RAISE NOTICE '   - 5 pacientes de prueba';
RAISE NOTICE '   - 5 turnos próximos';
RAISE NOTICE '   - 2 conversaciones activas';
RAISE NOTICE '   - 2 recetas activas';
RAISE NOTICE '   - 3 eventos de pacientes';
RAISE NOTICE '';
RAISE NOTICE '   📋 Para importar workflows: node scripts/deploy-workflows.js --activate';
