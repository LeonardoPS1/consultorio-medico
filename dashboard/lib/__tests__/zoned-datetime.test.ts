import { describe, it, expect } from 'vitest';
import { zonedDateTimeToUtc, zonedDateStr } from '@/lib/zoned-time';

describe('zonedDateTimeToUtc (America/Santiago)', () => {
  it('convierte hora de pared a UTC en horario estándar (UTC-4)', () => {
    const utc = zonedDateTimeToUtc('2026-08-11', '09:00', 'America/Santiago');
    expect(utc.toISOString()).toBe('2026-08-11T13:00:00.000Z');
  });

  it('convierte hora de pared a UTC en horario de verano (UTC-3)', () => {
    const utc = zonedDateTimeToUtc('2026-01-15', '09:00', 'America/Santiago');
    expect(utc.toISOString()).toBe('2026-01-15T12:00:00.000Z');
  });

  it('usa America/Santiago cuando la zona es inválida', () => {
    expect(zonedDateTimeToUtc('2026-08-11', '09:00', 'Zona/Inexistente').toISOString()).toBe(
      '2026-08-11T13:00:00.000Z',
    );
  });

  it('acepta horas sin cero a la izquierda', () => {
    expect(zonedDateTimeToUtc('2026-08-11', '9:00').toISOString()).toBe(
      zonedDateTimeToUtc('2026-08-11', '09:00').toISOString(),
    );
  });

  it('lanza error con fecha u hora inválida', () => {
    expect(() => zonedDateTimeToUtc('11-08-2026', '09:00')).toThrow();
    expect(() => zonedDateTimeToUtc('2026-08-11', '')).toThrow();
  });

  it('el instante resultante pertenece al día local de la clínica', () => {
    const utc = zonedDateTimeToUtc('2026-08-11', '09:00', 'America/Santiago');
    expect(zonedDateStr(utc, 'America/Santiago')).toBe('2026-08-11');
  });
});
