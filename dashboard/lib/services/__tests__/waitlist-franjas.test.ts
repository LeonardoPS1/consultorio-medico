import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de `proximasFranjasLibres` (lib/services/waitlist.ts).
 *
 * Fixtures usados con reloj fijo (vi.setSystemTime) para ser deterministas:
 * - Lunes 2026-08-10 08:00 local (día 1 de la semana → 'Lunes').
 * - Médico atiende Lun-Vie 09:00-13:00, `duracionTurnoMinutos: 30`.
 * - Un `turnos` a las 09:00 (ocupa la franja).
 * - Un `bloqueosAgenda` 10:00-11:00 (bloquea dos franjas).
 */

// ─── Mocks (vi.hoisted para poder usarlos en vi.mock) ──

const h = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const rowsByTable = new Map<object, unknown[]>();
  // Tablas de drizzle (identity única por objeto)
  const medicos = { id: 'medicos' };
  const turnos = { id: 'turnos' };
  const bloqueosAgenda = { id: 'bloqueosAgenda' };
  return { mockSelect, rowsByTable, medicos, turnos, bloqueosAgenda };
});

vi.mock('@/drizzle/schema', () => ({
  medicos: h.medicos,
  turnos: h.turnos,
  bloqueosAgenda: h.bloqueosAgenda,
  pacientes: { id: 'pacientes' },
  listaEspera: { id: 'listaEspera' },
  ofertasTurno: { id: 'ofertasTurno' },
}));

vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect } }));

vi.mock('@/lib/api-handler', () => ({
  notFound: (m: string) => {
    throw new Error(m);
  },
  conflict: (m: string) => {
    throw new Error(m);
  },
  fail: (m: string) => {
    throw new Error(m);
  },
}));

vi.mock('@/lib/logger', () => ({
  safeLog: vi.fn(),
  safeWarn: vi.fn(),
  safeError: vi.fn(),
}));

const ROWS = h.rowsByTable;
const mockSelect = h.mockSelect;
const medicos = h.medicos;
const turnos = h.turnos;
const bloqueosAgenda = h.bloqueosAgenda;

// Cadena tipo drizzle (select → from → where → limit)
mockSelect.mockImplementation(() => ({
  from: (table: object) => {
    const chain: any = {
      leftJoin: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      then: (resolve: (value: unknown[]) => void) => resolve(ROWS.get(table) ?? []),
    };
    return chain;
  },
}));

// ─── Fixtures ─────────────────────────────────────────

function makeHorario(overrides: Record<string, unknown> = {}) {
  return {
    activo: true,
    inicio: '09:00',
    fin: '13:00',
    tipo: 'corrido',
    inicio2: null,
    fin2: null,
    ...overrides,
  };
}

function makeMedico() {
  return {
    id: 'med-1',
    duracionTurnoMinutos: 30,
    horarios: {
      Lunes: makeHorario(),
      Martes: makeHorario(),
      Miercoles: makeHorario(),
      Jueves: makeHorario(),
      Viernes: makeHorario(),
    },
  };
}

function makeTurno(fechaHora: Date, duracionMinutos = 30) {
  return { fechaHora, duracionMinutos, estado: 'confirmada', medicoId: 'med-1' };
}

function makeBloqueo(fechaInicio: Date, fechaFin: Date) {
  return { fechaInicio, fechaFin, medicoId: 'med-1' };
}

import { proximasFranjasLibres } from '@/lib/services/waitlist';

describe('proximasFranjasLibres', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T08:00:00'));
    mockSelect.mockClear();
    ROWS.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('devuelve slots respetando horario y excluyendo turnos ocupados y bloques', async () => {
    ROWS.set(medicos, [makeMedico()]);
    ROWS.set(turnos, [makeTurno(new Date('2026-08-10T09:00:00'))]);
    ROWS.set(bloqueosAgenda, [
      makeBloqueo(new Date('2026-08-10T10:00:00'), new Date('2026-08-10T11:00:00')),
    ]);

    const result = await proximasFranjasLibres('med-1', { dias: 1, limite: 20 });

    // 09:00-13:00 con pasos de 30min: 09:00,,09:30,10:00,10:30,11:00,11:30,12:00,12:30
    // → 09:00 ocupado por turno, 10:00 y 10:30 bloqueados
    const esperado = ['09:30', '11:00', '11:30', '12:00', '12:30'].map((hora) =>
      new Date(`2026-08-10T${hora}:00`).getTime(),
    );
    expect(result.map((f) => f.fechaHora.getTime())).toEqual(esperado);
    expect(result).toHaveLength(5);
    result.forEach((f) => {
      expect(f.duracionMinutos).toBe(30);
      expect(f.fechaHora).toBeInstanceOf(Date);
    });
  });

  it('respeta limite y dias', async () => {
    ROWS.set(medicos, [makeMedico()]);
    ROWS.set(turnos, []);
    ROWS.set(bloqueosAgenda, []);

    // limite: corta al llegar a 3 (09:00, 09:30, 10:00 del Lunes)
    const limitado = await proximasFranjasLibres('med-1', { dias: 1, limite: 3 });
    expect(limitado).toHaveLength(3);
    expect(limitado[0].fechaHora.getTime()).toBe(new Date('2026-08-10T09:00:00').getTime());
    expect(limitado[2].fechaHora.getTime()).toBe(new Date('2026-08-10T10:00:00').getTime());

    // dias: 2 días hábiles → 8 slots por día (Lunes + Martes)
    const dosDias = await proximasFranjasLibres('med-1', { dias: 2, limite: 50 });
    expect(dosDias).toHaveLength(16);
    expect(dosDias[15].fechaHora.getTime()).toBe(new Date('2026-08-11T12:30:00').getTime());
  });

  it('no devuelve franjas en el pasado (salta al día siguiente)', async () => {
    // Si ya pasó todo el horario del Lunes (14:00 > 13:00), empieza el Martes
    vi.setSystemTime(new Date('2026-08-10T14:00:00'));
    ROWS.set(medicos, [makeMedico()]);
    ROWS.set(turnos, []);
    ROWS.set(bloqueosAgenda, []);

    const result = await proximasFranjasLibres('med-1', { dias: 2, limite: 50 });

    expect(result).toHaveLength(8); // solo Martes
    expect(result.every((f) => f.fechaHora.getDay() === 2)).toBe(true); // martes
    expect(result[0].fechaHora.getTime()).toBe(new Date('2026-08-11T09:00:00').getTime());
  });
});
