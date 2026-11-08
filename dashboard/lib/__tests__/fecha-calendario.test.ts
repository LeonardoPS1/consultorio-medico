import { describe, it, expect } from 'vitest';
import { formatFechaCalendario, parseFechaCalendario } from '@/lib/fecha-calendario';

describe('parseFechaCalendario', () => {
  it('interpreta YYYY-MM-DD como medianoche local, sin corrimiento UTC', () => {
    const date = parseFechaCalendario('2026-03-01');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getDate()).toBe(1);
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(parseFechaCalendario('2024-02-29')).not.toBeNull();
  });

  it('rechaza fechas inexistentes', () => {
    expect(parseFechaCalendario('2023-02-29')).toBeNull();
    expect(parseFechaCalendario('2026-02-30')).toBeNull();
    expect(parseFechaCalendario('2026-13-01')).toBeNull();
  });

  it('rechaza formatos que no son fecha de calendario', () => {
    expect(parseFechaCalendario('2026-1-15')).toBeNull();
    expect(parseFechaCalendario('15-01-2026')).toBeNull();
    expect(parseFechaCalendario('2026-01-15T10:00:00.000Z')).toBeNull();
    expect(parseFechaCalendario('')).toBeNull();
    expect(parseFechaCalendario('no-es-fecha')).toBeNull();
  });
});

describe('formatFechaCalendario', () => {
  it('formatea una fecha de calendario sin perder un día', () => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    };
    expect(formatFechaCalendario('2026-01-01', options)).toBe(
      new Date(2026, 0, 1).toLocaleDateString('es-CL', options),
    );
  });

  it('devuelve un guion largo para valores vacíos', () => {
    expect(formatFechaCalendario(null)).toBe('—');
    expect(formatFechaCalendario(undefined)).toBe('—');
    expect(formatFechaCalendario('')).toBe('—');
  });

  it('devuelve un guion largo para valores inválidos', () => {
    expect(formatFechaCalendario('no-es-fecha')).toBe('—');
  });

  it('mantiene el comportamiento previo con timestamps ISO', () => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    };
    const iso = '2026-01-15T13:00:00.000Z';
    expect(formatFechaCalendario(iso, options)).toBe(
      new Date(iso).toLocaleDateString('es-CL', options),
    );
  });
});
