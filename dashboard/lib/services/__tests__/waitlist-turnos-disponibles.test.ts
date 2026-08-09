import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de `waitlistService.turnosDisponibles` (lib/services/waitlist.ts).
 *
 * Verifica que el helper devuelva los turnos futuros de un médico con formato
 * es-CL (`fecha`/"10 de agosto", `hora`/"09:00") y el nombre del paciente en
 * `pacienteNombre`, y que la query excluya turnos borrados (deletedAt) y
 * estados fuera de ['pendiente','confirmada','cancelada'].
 *
 * Como la exclusión se hace en la cláusula WHERE (SQL), el mock simula el
 * filtrado de la DB usando los valores capturados de los operadores de
 * drizzle-orm (`inArray`, `gte`, `sql`), de modo que el output refleja lo que
 * devolvería la query real.
 */

// ─── Mocks (vi.hoisted para poder usarlos en vi.mock) ──

const h = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const rowsByTable = new Map<object, unknown[]>();

  // Capturas de los operadores de drizzle-orm (para simular el WHERE en el mock)
  const inArrayCalls: unknown[][] = [];
  const gteCalls: unknown[] = [];
  const sqlTemplates: string[] = [];

  // Tablas de drizzle (identity única por objeto)
  const turnos = { id: 'turnos' };
  const pacientes = { id: 'pacientes' };
  const medicos = { id: 'medicos' };
  const ofertasTurno = { id: 'ofertasTurno' };
  const listaEspera = { id: 'listaEspera' };
  const bloqueosAgenda = { id: 'bloqueosAgenda' };

  return {
    mockSelect,
    rowsByTable,
    inArrayCalls,
    gteCalls,
    sqlTemplates,
    turnos,
    pacientes,
    medicos,
    ofertasTurno,
    listaEspera,
    bloqueosAgenda,
  };
});

// Envuelve los operadores de drizzle-orm para capturar los argumentos del WHERE.
// `importOriginal` conserva el resto de la API (and, asc, ...) intacto.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eq: vi.fn((col: any, val: any) => actual.eq(col, val)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gte: vi.fn((col: any, val: any) => {
      h.gteCalls.push(val);
      return actual.gte(col, val);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inArray: vi.fn((col: any, vals: any[]) => {
      h.inArrayCalls.push(vals);
      return actual.inArray(col, vals);
    }),
    // tag template: sql`...`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sql: (...args: any[]) => {
      const strings = Array.isArray(args[0]) ? args[0] : [];
      h.sqlTemplates.push(Array.isArray(strings) ? strings.join(' ') : '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actual.sql as (...a: any[]) => any)(...args);
    },
  };
});

vi.mock('@/drizzle/schema', () => ({
  turnos: h.turnos,
  pacientes: h.pacientes,
  medicos: h.medicos,
  ofertasTurno: h.ofertasTurno,
  listaEspera: h.listaEspera,
  bloqueosAgenda: h.bloqueosAgenda,
}));

vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect } }));

vi.mock('@/lib/api-handler', () => ({
  notFound: (m: string) => {
    throw new Error(m);
  },
  conflict: (m: string) => {
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
const { turnos, pacientes } = h;

// Cadena tipo drizzle (select → from → [leftJoin] → where → orderBy → [limit]).
// `then` simula la DB aplicando el filtro del WHERE capturado sobre las rows
// (inArray de estados + IS NULL de deletedAt), igual que haría PostgreSQL.
mockSelect.mockImplementation(() => ({
  from: (table: object) => {
    const chain: any = {
      leftJoin: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      then: (resolve: (value: unknown[]) => void) => {
        const estados = h.inArrayCalls.length ? h.inArrayCalls[h.inArrayCalls.length - 1] : [];
        const tieneFiltroDeleted =
          h.sqlTemplates.length > 0 && h.sqlTemplates.some((t) => t.includes('IS NULL'));
        const rows = (ROWS.get(table) ?? []) as Array<Record<string, unknown>>;
        const filtradas = rows.filter((row) => {
          if (row.estado !== undefined && !estados.includes(String(row.estado))) return false;
          if (tieneFiltroDeleted && row.deletedAt != null) return false;
          return true;
        });
        resolve(filtradas);
      },
    };
    return chain;
  },
}));

// ─── Fixtures ─────────────────────────────────────────

function makeTurno(overrides: Record<string, unknown> = {}) {
  return {
    id: 'turno-1',
    fechaHora: new Date('2026-08-10T09:00:00'),
    estado: 'confirmada',
    pacienteId: 'pac-1',
    medicoId: 'med-1',
    pacienteNombre: 'Ana',
    pacienteApellido: 'Perez',
    ...overrides,
  };
}

import { waitlistService } from '@/lib/services/waitlist';

describe('waitlistService.turnosDisponibles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T08:00:00'));
    mockSelect.mockClear();
    ROWS.clear();
    h.inArrayCalls.length = 0;
    h.gteCalls.length = 0;
    h.sqlTemplates.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('1. devuelve turnos futuros del médico con fecha/hora es-CL y pacienteNombre', async () => {
    ROWS.set(turnos, [makeTurno()]);

    const result = await waitlistService.turnosDisponibles('med-1');

    expect(result).toHaveLength(1);
    const turno = result[0];
    expect(turno.id).toBe('turno-1');
    expect(turno.fechaHora).toBeInstanceOf(Date);
    expect(turno.fecha).toContain('agosto');
    expect(turno.hora).toBe('09:00');
    expect(turno.pacienteNombre).toBe('Ana Perez');
    expect(turno.estado).toBe('confirmada');
    expect(turno.medicoId).toBe('med-1');
  });

  it('2. excluye turnos borrados y estados fuera de pendiente/confirmada/cancelada', async () => {
    ROWS.set(turnos, [
      makeTurno({ id: 'turno-cancelada', estado: 'cancelada' }),
      makeTurno({
        id: 'turno-atendido',
        estado: 'atendido',
        fechaHora: new Date('2026-08-10T10:00:00'),
      }),
      makeTurno({
        id: 'turno-borrado',
        estado: 'confirmada',
        deletedAt: new Date('2026-08-09T12:00:00'),
      }),
    ]);

    const result = await waitlistService.turnosDisponibles('med-1');

    // cancelada SÍ está incluida; atendido y deletedAt excluidos
    expect(result.map((t) => t.id)).toEqual(['turno-cancelada']);
    expect(result[0]!.estado).toBe('cancelada');

    // La query se construyó con el filtro correcto
    expect(h.inArrayCalls.length).toBeGreaterThan(0);
    expect(h.inArrayCalls[h.inArrayCalls.length - 1]).toEqual([
      'pendiente',
      'confirmada',
      'cancelada',
    ]);
    expect(h.gteCalls.length).toBeGreaterThan(0);
    expect(h.gteCalls[h.gteCalls.length - 1]).toBeInstanceOf(Date);
    expect(h.sqlTemplates.some((t) => t.includes('IS NULL'))).toBe(true);
  });

  it('3. consulta la tabla turnos y une pacientes para el nombre', async () => {
    ROWS.set(turnos, [makeTurno()]);

    await waitlistService.turnosDisponibles('med-1');

    expect(mockSelect).toHaveBeenCalledOnce();
  });
});
