import { describe, it, expect } from 'vitest';
import { getZonedDayRange, zonedDateStr, DEFAULT_CLINIC_TZ } from '@/lib/zoned-time';

describe('getZonedDayRange (America/Santiago)', () => {
  it('devuelve el rango del día local en horario estándar (UTC-4)', () => {
    const d = new Date('2026-08-11T13:44:00Z');
    const { start, end } = getZonedDayRange(d, 'America/Santiago');
    expect(start.toISOString()).toBe('2026-08-11T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(24 * 3600_000);
  });

  it('devuelve el rango del día local en horario DST (UTC-3)', () => {
    const d = new Date('2026-01-15T13:44:00Z');
    const { start, end } = getZonedDayRange(d, 'America/Santiago');
    expect(start.toISOString()).toBe('2026-01-15T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-16T03:00:00.000Z');
  });

  it('resuelve el día correcto cerca de la medianoche (desfase UTC/local)', () => {
    const d = new Date('2026-08-10T23:30:00Z'); // 19:30 en Santiago → aún 2026-08-10
    const { start, end } = getZonedDayRange(d, 'America/Santiago');
    expect(start.toISOString()).toBe('2026-08-10T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-11T04:00:00.000Z');
    expect(zonedDateStr(d, 'America/Santiago')).toBe('2026-08-10');
  });

  it('maneja el día de retraso de reloj (25 horas)', () => {
    const d = new Date('2026-04-04T23:00:00Z'); // día del fin de DST
    const { start, end } = getZonedDayRange(d, 'America/Santiago');
    expect(end.getTime() - start.getTime()).toBe(25 * 3600_000);
  });

  it('usa America/Santiago por defecto', () => {
    expect(DEFAULT_CLINIC_TZ).toBe('America/Santiago');
    const { start } = getZonedDayRange(new Date('2026-08-11T13:44:00Z'));
    expect(start.toISOString()).toBe('2026-08-11T04:00:00.000Z');
  });
});
