-- Migration 0030: Fix turnos CHECK constraint para incluir todos los estados
-- La DB tenía un CHECK que solo permitía ('pendiente', 'confirmada', 'cancelada')
-- pero el schema de Drizzle y el frontend usan: pendiente, confirmada,
-- en_atencion, atendido, cancelada, no_asistio

-- 1. Eliminar el constraint viejo (si existe de migraciones previas)
ALTER TABLE turnos DROP CONSTRAINT IF EXISTS turnos_estado_check;

-- 2. Crear el nuevo con todos los estados válidos
ALTER TABLE turnos ADD CONSTRAINT turnos_estado_check
  CHECK (estado IN ('pendiente', 'confirmada', 'en_atencion', 'atendido', 'cancelada', 'no_asistio'));
