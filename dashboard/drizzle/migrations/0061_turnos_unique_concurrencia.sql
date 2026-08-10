-- 0061_turnos_unique_concurrencia.sql
-- Prevención de doble reserva en el agendamiento (portal y waitlist).
--
-- Índice único PARCIAL sobre turnos que impide dos turnos ACTIVOS (no
-- cancelados y no no_asistio) para el mismo médico y la misma fecha/hora.
-- Es la protección real a nivel de PostgreSQL contra condiciones de carrera
-- en el agendamiento: dos requests concurrentes no pueden insertar el mismo
-- slot, aunque la verificación de disponibilidad de la aplicación se cruce.
--
-- MEDICO_ID ya escopa por tenant de forma implícita (un médico pertenece a
-- una sola sucursal/tenant), por lo que no se agrega tenant_id a este índice.
-- Si existieran duplicados históricos previos, el CREATE fallará — en ese
-- caso revisar/cancelar los duplicados antes de aplicar.

CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_medico_fecha_activo
  ON turnos (medico_id, fecha_hora)
  WHERE deleted_at IS NULL AND estado NOT IN ('cancelada', 'no_asistio');