import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de `waitlistService.crearOferta` (lib/services/waitlist.ts).
 *
 * Verifica la firma ampliada que acepta `{ turnoId }` (turno existente) o
 * `{ fechaHora, pacienteId, medicoId }` (crear turno nuevo en franja libre):
 * 1. turnoId en estado `pendiente` → crea oferta (no exige `cancelada`).
 * 2. turnoId en estado `cancelada` → crea oferta (compatibilidad).
 * 3. turno de otro médico → rechaza.
 * 4. turno en el pasado → rechaza.
 * 5. turno con otra oferta pendiente → rechaza.
 * 6. segunda oferta pendiente del mismo paciente → rechaza.
 * 7. fechaHora de franja libre → inserta turno nuevo + oferta.
 * 8. fechaHora ocupada → rechaza.
 *
 * Reloj fijo (vi.setSystemTime): Lunes 2026-08-10 08:00 local. El médico
 * atiende Lun-Vie 09:00-13:00, `duracionTurnoMinutos: 30` (mismo fixture que
 * waitlist-franjas.test.ts, así `proximasFranjasLibres` devuelve slot 09:00).
 */

// ─── Mocks (vi.hoisted para poder usarlos en vi.mock) ──

const h = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const rowsByTable = new Map<object, unknown[]>();
  const rowsJoin = new Map<object, unknown[]>();
  const insertValues: Array<Record<string, unknown>> = [];

  // Tablas de drizzle (identity única por objeto)
  const turnos = { id: 'turnos' };
  const pacientes = { id: 'pacientes' };
  const medicos = { id: 'medicos' };
  const ofertasTurno = { id: 'ofertasTurno' };
  const listaEspera = { id: 'listaEspera' };
  const bloqueosAgenda = { id: 'bloqueosAgenda' };

  // Cadena tipo drizzle (select → from → [innerJoin|leftJoin] → where → orderBy → limit).
  // Las queries con join leen el Map `rowsJoin`; las simples leen `rowsByTable`.
  mockSelect.mockImplementation(() => ({
    from: (table: object) => {
      let joined = false;
      const chain: any = {
        innerJoin: () => {
          joined = true;
          return chain;
        },
        leftJoin: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        then: (resolve: (value: unknown[]) => void) =>
          resolve((joined ? rowsJoin : rowsByTable).get(table) ?? []),
      };
      return chain;
    },
  }));

  // Cadena tipo drizzle para insert (insert → values → returning).
  // Registra los values en `insertValues`; distingue insert de `turnos`
  // (tiene `fechaHora`) de insert de `ofertasTurno`.
  mockInsert.mockImplementation(() => ({
    values: (values: Record<string, unknown>) => ({
      returning: () => {
        const snapshot = { ...values };
        insertValues.push(snapshot);
        const esTurno = 'fechaHora' in snapshot;
        return Promise.resolve(
          esTurno
            ? [{ id: 'turno-nuevo-1' }]
            : [
                {
                  id: 'oferta-1',
                  listaEsperaId: snapshot.listaEsperaId,
                  turnoId: snapshot.turnoId,
                  estado: 'pendiente',
                  notificada: false,
                  expiracion: snapshot.expiracion ?? new Date(),
                  fechaOferta: new Date(),
                  respondedAt: null,
                  notificadaAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
        );
      },
    }),
  }));

  return {
    mockSelect,
    mockInsert,
    rowsByTable,
    rowsJoin,
    insertValues,
    turnos,
    pacientes,
    medicos,
    ofertasTurno,
    listaEspera,
    bloqueosAgenda,
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

vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect, insert: h.mockInsert } }));

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
const ROWS_JOIN = h.rowsJoin;
const INSERT_VALUES = h.insertValues;
const mockSelect = h.mockSelect;
const mockInsert = h.mockInsert;
const { turnos, medicos, ofertasTurno, listaEspera, bloqueosAgenda } = h;

// ─── Fixtures ─────────────────────────────────────────

function makeInscripcion(overrides: Record<string, unknown> = {}) {
  return { id: 'le-1', pacienteId: 'pac-1', medicoId: 'med-1', estado: 'activa', ...overrides };
}

function makeTurno(overrides: Record<string, unknown> = {}) {
  return {
    id: 'turno-1',
    estado: 'pendiente',
    medicoId: 'med-1',
    fechaHora: '2026-08-10T09:00:00',
    deletedAt: null,
    ...overrides,
  };
}

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

function setupCasoA() {
  ROWS.set(listaEspera, [makeInscripcion()]);
  ROWS.set(turnos, [makeTurno()]);
  ROWS.set(ofertasTurno, []);
  ROWS_JOIN.set(ofertasTurno, []);
}

function setupCasoB() {
  ROWS.set(listaEspera, [makeInscripcion()]);
  ROWS.set(medicos, [makeMedico()]);
  ROWS.set(turnos, []);
  ROWS.set(bloqueosAgenda, []);
  ROWS.set(ofertasTurno, []);
  ROWS_JOIN.set(ofertasTurno, []);
}

import { waitlistService } from '@/lib/services/waitlist';

describe('waitlistService.crearOferta — turno existente o franja libre', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T08:00:00'));
    mockSelect.mockClear();
    mockInsert.mockClear();
    INSERT_VALUES.length = 0;
    ROWS.clear();
    ROWS_JOIN.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('1. turnoId en estado pendiente → crea oferta (no exige cancelada)', async () => {
    setupCasoA();

    const result = await waitlistService.crearOferta('le-1', { turnoId: 'turno-1' });

    expect(result.estado).toBe('pendiente');
    expect(result.turnoId).toBe('turno-1');
    expect(mockInsert).toHaveBeenCalledWith(ofertasTurno);
    const ofertaInsert = INSERT_VALUES.find(
      (v) => v.turnoId === 'turno-1' && v.listaEsperaId === 'le-1',
    );
    expect(ofertaInsert).toBeDefined();
  });

  it('2. turnoId en estado cancelada → crea oferta (compatibilidad)', async () => {
    ROWS.set(listaEspera, [makeInscripcion()]);
    ROWS.set(turnos, [makeTurno({ estado: 'cancelada' })]);
    ROWS.set(ofertasTurno, []);
    ROWS_JOIN.set(ofertasTurno, []);

    const result = await waitlistService.crearOferta('le-1', { turnoId: 'turno-1' });

    expect(result.estado).toBe('pendiente');
    expect(result.turnoId).toBe('turno-1');
    expect(mockInsert).toHaveBeenCalledWith(ofertasTurno);
  });

  it('3. turno de otro médico → rechaza', async () => {
    ROWS.set(listaEspera, [makeInscripcion()]);
    ROWS.set(turnos, [makeTurno({ medicoId: 'med-2' })]);

    await expect(waitlistService.crearOferta('le-1', { turnoId: 'turno-1' })).rejects.toThrow(
      'El turno debe pertenecer al mismo médico del paciente en espera',
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('4. turno pasado → rechaza', async () => {
    ROWS.set(listaEspera, [makeInscripcion()]);
    ROWS.set(turnos, [makeTurno({ fechaHora: '2026-08-09T09:00:00' })]);

    await expect(waitlistService.crearOferta('le-1', { turnoId: 'turno-1' })).rejects.toThrow(
      'El turno debe estar programado en el futuro',
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('5. turno con otra oferta pendiente → rechaza', async () => {
    ROWS.set(listaEspera, [makeInscripcion()]);
    ROWS.set(turnos, [makeTurno()]);
    ROWS.set(ofertasTurno, [{ id: 'oferta-existente' }]);
    ROWS_JOIN.set(ofertasTurno, []);

    await expect(waitlistService.crearOferta('le-1', { turnoId: 'turno-1' })).rejects.toThrow(
      'Ese turno ya tiene una oferta pendiente',
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('6. segunda oferta pendiente del mismo paciente → rechaza', async () => {
    ROWS.set(listaEspera, [makeInscripcion()]);
    ROWS.set(turnos, [makeTurno()]);
    ROWS.set(ofertasTurno, []);
    // Join (A-4): existe oferta pendiente de OTRA inscripción del mismo paciente
    ROWS_JOIN.set(ofertasTurno, [{ id: 'oferta-prev' }]);

    await expect(waitlistService.crearOferta('le-1', { turnoId: 'turno-1' })).rejects.toThrow(
      'Ya existe un turno ofrecido pendiente para este paciente',
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('7. fechaHora de franja libre → crea turno nuevo + oferta', async () => {
    setupCasoB();

    const result = await waitlistService.crearOferta('le-1', {
      fechaHora: new Date('2026-08-10T09:00:00'),
      pacienteId: 'pac-1',
      medicoId: 'med-1',
    });

    // Se insertó turno nuevo y la oferta apunta a ese turno
    expect(mockInsert).toHaveBeenCalledWith(turnos);
    const turnoInsert = INSERT_VALUES.find(
      (v) => v.pacienteId === 'pac-1' && v.medicoId === 'med-1',
    );
    expect(turnoInsert).toBeDefined();
    expect(turnoInsert!.duracionMinutos).toBe(30);
    expect(result.turnoId).toBe('turno-nuevo-1');
    expect(result.estado).toBe('pendiente');
    const ofertaInsert = INSERT_VALUES.find(
      (v) => v.turnoId === 'turno-nuevo-1' && v.listaEsperaId === 'le-1',
    );
    expect(ofertaInsert).toBeDefined();
  });

  it('8. fechaHora ocupada (no es franja) → rechaza', async () => {
    setupCasoB();

    // 08:30 está fuera del horario del médico (empieza 09:00) → no es franja
    await expect(
      waitlistService.crearOferta('le-1', {
        fechaHora: new Date('2026-08-10T08:30:00'),
        pacienteId: 'pac-1',
        medicoId: 'med-1',
      }),
    ).rejects.toThrow('Franja no disponible para el médico');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
