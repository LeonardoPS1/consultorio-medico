import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi
      .fn()
      .mockReturnValue({
        from: vi
          .fn()
          .mockReturnValue({
            innerJoin: vi
              .fn()
              .mockReturnValue({
                where: vi
                  .fn()
                  .mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
                  }),
              }),
          }),
      }),
  },
}));

import { csvEscape, toCsv } from '@/lib/services/historial';

describe('csvEscape', () => {
  it('escapa comillas dobles', () => {
    expect(csvEscape('dice "hola"')).toBe('"dice ""hola"""');
  });

  it('devuelve string vacío para null y undefined', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('envuelve texto plano entre comillas', () => {
    expect(csvEscape('texto')).toBe('"texto"');
  });
});

describe('toCsv', () => {
  const items = [
    {
      id: 'h_1',
      origen: 'historial',
      tipo: 'consulta',
      titulo: 'Consulta general',
      descripcion: 'Paciente estable',
      diagnosticoCodigo: 'A00',
      diagnosticoDescripcion: 'Cólera',
      subjetivo: null,
      objetivo: null,
      assessment: null,
      plan: null,
      fecha: '2026-08-01T12:00:00.000Z',
      pacienteId: 'p1',
      pacienteNombre: 'Juan Pérez',
      pacienteTelefono: '+569111',
    },
  ] as const;

  it('incluye cabecera en español', () => {
    const csv = toCsv([...items]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('paciente');
    expect(lines[0]).toContain('origen');
    expect(lines[0]).toContain('diagnostico');
  });

  it('serializa una fila con campos principales', () => {
    const csv = toCsv([...items]);
    expect(csv).toContain('Juan Pérez');
    expect(csv).toContain('consulta');
    expect(csv).toContain('historial');
  });

  it('devuelve solo cabecera si la lista está vacía', () => {
    const csv = toCsv([]);
    expect(csv.split('\n')).toHaveLength(1);
  });
});
