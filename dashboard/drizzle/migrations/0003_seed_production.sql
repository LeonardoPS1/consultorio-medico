-- ============================================================
-- Migration 0003: Seed producción (admin user + default data)
-- ============================================================
-- Este script se ejecuta como parte del setup de producción.
-- Es idempotente: se puede ejecutar múltiples veces sin riesgo.

-- ─── 1. Asegurar tenant por defecto ─────────────────────────
INSERT INTO tenants (id, nombre, subdomain, logo_url, colores, activo)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Consultorio Médico',
  'demo',
  '/aicoremed_dark_1200.svg',
  '{"primary": "#2563eb"}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Crear usuario admin si no existe ────────────────────
-- Password: "admin123" hasheado con bcrypt (salt rounds: 10)
-- Para generar en producción ejecutar:
--   node -e "require('bcryptjs').hash('admin123', 10).then(h => console.log(h))"
DO $$
DECLARE
  admin_id UUID;
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@consultorio.com') INTO admin_exists;

  IF NOT admin_exists THEN
    admin_id := gen_random_uuid();

    INSERT INTO usuarios (id, email, password_hash, nombre, rol, activo, tenant_id, plan, created_at, updated_at)
    VALUES (
      admin_id,
      'admin@consultorio.com',
      -- bcrypt hash de "admin123" (⚠️ CAMBIAR en producción)
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      'Administrador',
      'admin',
      true,
      '00000000-0000-0000-0000-000000000000',
      'professional',
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Usuario admin creado: admin@consultorio.com / admin123';

    -- Crear médico asociado
    INSERT INTO medicos (id, usuario_id, nombre, especialidad, email, activo, tenant_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      admin_id,
      'Administrador',
      'Dirección Médica',
      'admin@consultorio.com',
      true,
      '00000000-0000-0000-0000-000000000000',
      NOW(),
      NOW()
    );
  ELSE
    RAISE NOTICE '⏭️ Usuario admin ya existe';
  END IF;
END $$;

-- ─── 3. Crear usuario médico de prueba si no existe ─────────
DO $$
DECLARE
  medico_id UUID;
  medico_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE email = 'medico@consultorio.com') INTO medico_exists;

  IF NOT medico_exists THEN
    medico_id := gen_random_uuid();

    INSERT INTO usuarios (id, email, password_hash, nombre, rol, activo, tenant_id, plan, created_at, updated_at)
    VALUES (
      medico_id,
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

    INSERT INTO medicos (id, usuario_id, nombre, especialidad, email, telefono, activo, tenant_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      medico_id,
      'Dr. Rodríguez',
      'Medicina General',
      'medico@consultorio.com',
      '+5491155550000',
      true,
      '00000000-0000-0000-0000-000000000000',
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Usuario médico creado: medico@consultorio.com / medico123';
  ELSE
    RAISE NOTICE '⏭️ Usuario médico ya existe';
  END IF;
END $$;

-- ─── 4. Horarios de atención por defecto (si tabla vacía) ───
INSERT INTO horarios_atencion (dia, activo, inicio, fin, tenant_id)
SELECT * FROM (VALUES
    ('Lunes', true, '09:00', '18:00', '00000000-0000-0000-0000-000000000000'::uuid),
    ('Martes', true, '09:00', '18:00', '00000000-0000-0000-0000-000000000000'::uuid),
    ('Miércoles', true, '09:00', '18:00', '00000000-0000-0000-0000-000000000000'::uuid),
    ('Jueves', true, '09:00', '18:00', '00000000-0000-0000-0000-000000000000'::uuid),
    ('Viernes', true, '09:00', '18:00', '00000000-0000-0000-0000-000000000000'::uuid),
    ('Sábado', false, '09:00', '13:00', '00000000-0000-0000-0000-000000000000'::uuid),
    ('Domingo', false, '09:00', '13:00', '00000000-0000-0000-0000-000000000000'::uuid)
) AS v(dia, activo, inicio, fin, tenant_id)
WHERE NOT EXISTS (SELECT 1 FROM horarios_atencion LIMIT 1);

-- ─── 5. Plantillas de mensajes por defecto ──────────────────
INSERT INTO plantillas_mensajes (nombre, contenido, categoria, variables, activa, tenant_id)
SELECT * FROM (VALUES
    ('Recordatorio 24hs', 'Hola {{paciente}}, te recordamos que tienes un turno con el Dr. {{medico}} mañana a las {{hora}}. Responde "CONFIRMAR" para confirmar asistencia o "CANCELAR" si necesitas reprogramar.', 'recordatorios', ARRAY['paciente', 'medico', 'hora'], true, '00000000-0000-0000-0000-000000000000'::uuid),
    ('Recordatorio 1h', 'Recordatorio: {{paciente}}, tu turno con el Dr. {{medico}} es en 1 hora ({{hora}}). Te esperamos!', 'recordatorios', ARRAY['paciente', 'medico', 'hora'], true, '00000000-0000-0000-0000-000000000000'::uuid),
    ('Confirmacion turno', 'Gracias {{paciente}}! Tu turno con el Dr. {{medico}} el dia {{fecha}} a las {{hora}} fue confirmado.', 'turnos', ARRAY['paciente', 'medico', 'fecha', 'hora'], true, '00000000-0000-0000-0000-000000000000'::uuid),
    ('Cancelacion turno', 'Hola {{paciente}}, te confirmamos que tu turno del {{fecha}} a las {{hora}} fue cancelado.', 'turnos', ARRAY['paciente', 'fecha', 'hora'], true, '00000000-0000-0000-0000-000000000000'::uuid),
    ('Receta lista', '{{paciente}}, tu receta de {{medicamento}} ya esta lista. Pasa a retirarla por el consultorio.', 'recetas', ARRAY['paciente', 'medicamento'], true, '00000000-0000-0000-0000-000000000000'::uuid),
    ('Urgencia detectada', 'Alerta de urgencia: {{paciente}} reporto: "{{mensaje}}". Comunicarse a la brevedad.', 'alertas', ARRAY['paciente', 'mensaje'], true, '00000000-0000-0000-0000-000000000000'::uuid)
) AS v(nombre, contenido, categoria, variables, activa, tenant_id)
WHERE NOT EXISTS (SELECT 1 FROM plantillas_mensajes LIMIT 1);

DO $$
BEGIN
  RAISE NOTICE 'Seed de produccion completado';
END $$;
