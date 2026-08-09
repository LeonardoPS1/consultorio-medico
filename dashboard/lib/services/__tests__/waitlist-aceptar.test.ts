import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de `waitlistService.aceptar` (lib/services/waitlist.ts).
 *
 * Verifica el endurecimiento de `aceptar`:
 * 1. Un turno que ya tiene otra oferta pendiente (de otra inscripción) se
 *    rechaza con `'Ese turno ya tiene una oferta pendiente'`.
 * 2. Aceptar válido (turno sin otra oferta, mismo paciente) → reasigna y NO
 *    notifica al paciente desplazado (no hay desplazado).
 * 3. Aceptar un turno que pertenecía a otro paciente → llama
 *    `notificarPacienteReasignado` (fire-and-forget vía import dinámico) con
 *    el turno actualizado y el paciente anterior.
 *
 * Los queries de `aceptar` se simulan con una cola secuencial de respuestas
 * (`selectQueue`), ya que `ofertasTurno` se lee dos veces (oferta y "otra
 * oferta") y la kv de table no alcanza a distinguirlas.
 */

// ─── Mocks (vi.hoisted para poder usarlos en vi.mock) ──

const h = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockNotificar = vi.fn().mockResolvedValue(true);

  const selectQueue: Array<unknown[]> = [];
  const updateRows = new Map<object, unknown[]>();
  const updateSets: Array<{ table: object; values: Record<string, unknown> }> = [];

  // Cadenas tipo drizzle (select → from → [where] → [orderBy] → limit → then).
  // `then` resuelve la próxima respuesta de `selectQueue` (orden del flujo).
  mockSelect.mockImplementation(() => ({
    from: () => {
      const chain: any = {
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        then: (resolve: (value: unknown[]) => void) => resolve(selectQueue.shift() ?? []),
      };
      return chain;
    },
  }));

  // Cadena tipo drizzle para update (update → set → where → [returning] | await).
  // Registra los values en `updateSets`; `returning` devuelve `updateRows[table]`.
  mockUpdate.mockImplementation((table: object) => ({
    set: (values: Record<string, unknown>) => {
      updateSets.push({ table, values });
      const chain: any = {
        where: () => chain,
        returning: () => Promise.resolve(updateRows.get(table) ?? []),
        then: (resolve: (value: unknown) => void) => resolve(undefined),
      };
      return chain;
    },
  }));

  // Tablas de drizzle (identidad única por objeto)
  const turnos = { id: 'turnos' };
  const pacientes = { id: 'pacientes' };
  const medicos = { id: 'medicos' };
  const ofertasTurno = { id: 'ofertasTurno' };
  const listaEspera = { id: 'listaEspera' };
  const bloqueosAgenda = { id: 'bloqueosAgenda' };

  return {
    mockSelect,
    mockUpdate,
    mockNotificar,
    selectQueue,
    updateRows,
    updateSets,
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

vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect, update: h.mockUpdate } }));

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

vi.mock('@/lib/whatsapp-waitlist', () => ({
  notificarPacienteReasignado: h.mockNotificar,
}));

const { turnos, ofertasTurno, listaEspera } = h;
const mockSelect = h.mockSelect;
const mockUpdate = h.mockUpdate;
const mockNotificar = h.mockNotificar;
const selectQueue = h.selectQueue;
const updateRows = h.updateRows;
const updateSets = h.updateSets;

// ─── Fixtures ─────────────────────────────────────────

function setupAceptar(
  overrides: {
    otraOferta?: unknown[];
    inscripcion?: Array<{ id: string; pacienteId: string }>;
    turnoAnterior?: Array<{ id: string; pacienteId: string }>;
    turnoActualizado?: Record<string, unknown>;
  } = {},
) {
  const {
    otraOferta = [],
    inscripcion = [{ id: 'le1', pacienteId: 'pNuevo' }],
    turnoAnterior = [{ id: 't1', pacienteId: 'pViejo' }],
    turnoActualizado = {
      id: 't1',
      pacienteId: inscripcion[0]?.pacienteId ?? 'pNuevo',
      estado: 'pendiente',
      fechaHora: new Date('2026-08-10T09:00:00'),
      medicoId: 'med-1',
      updatedAt: new Date(),
    },
  } = overrides;

  const oferta = {
    id: 'o1',
    estado: 'pendiente',
    expiracion: new Date(Date.now() + 60_000),
    listaEsperaId: 'le1',
    turnoId: 't1',
  };

  // Orden de queries en el flujo de aceptar:
  // 1. oferta (ofertasTurno) → 2. otraOferta (ofertasTurno) → 3. inscripcion
  // (listaEspera) → 4. turnoAnterior (turnos)
  selectQueue.push([oferta], otraOferta, inscripcion, turnoAnterior);
  updateRows.set(turnos, [turnoActualizado]);

  return { oferta };
}

import { waitlistService } from '@/lib/services/waitlist';

describe('waitlistService.aceptar — turno sin otra oferta + notificación reasignación', () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockUpdate.mockClear();
    mockNotificar.mockClear();
    selectQueue.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. turno con otra oferta pendiente → rechaza "Ese turno ya tiene una oferta pendiente"', async () => {
    setupAceptar({ otraOferta: [{ id: 'o2' }] });

    await expect(waitlistService.aceptar('o1')).rejects.toThrow(
      'Ese turno ya tiene una oferta pendiente',
    );
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockNotificar).not.toHaveBeenCalled();
  });

  it('2. aceptar válido con mismo paciente → no notifica y reasigna', async () => {
    setupAceptar({
      inscripcion: [{ id: 'le1', pacienteId: 'pNuevo' }],
      turnoAnterior: [{ id: 't1', pacienteId: 'pNuevo' }],
      turnoActualizado: {
        id: 't1',
        pacienteId: 'pNuevo',
        estado: 'pendiente',
        fechaHora: new Date('2026-08-10T09:00:00'),
        medicoId: 'med-1',
        updatedAt: new Date(),
      },
    });

    const result = await waitlistService.aceptar('o1');

    expect(result.oferta.estado).toBe('aceptada');
    expect(result.turno.pacienteId).toBe('pNuevo');
    // turno reasignado al paciente de la inscripción
    const updateTurno = updateSets.find((u) => u.table === turnos);
    expect(updateTurno?.values).toMatchObject({
      pacienteId: 'pNuevo',
      estado: 'pendiente',
    });
    // oferta marcada aceptada
    const updateOferta = updateSets.find((u) => u.table === ofertasTurno);
    expect(updateOferta?.values).toMatchObject({ estado: 'aceptada' });
    // inscripción cumplida
    const updateLista = updateSets.find((u) => u.table === listaEspera);
    expect(updateLista?.values).toMatchObject({ estado: 'cumplida' });
    // mismo paciente → no hay desplazado que notificar
    expect(mockNotificar).not.toHaveBeenCalled();
  });

  it('3. turno de otro paciente → llama notificarPacienteReasignado', async () => {
    setupAceptar({
      inscripcion: [{ id: 'le1', pacienteId: 'pNuevo' }],
      turnoAnterior: [{ id: 't1', pacienteId: 'pViejo' }],
      turnoActualizado: {
        id: 't1',
        pacienteId: 'pNuevo',
        estado: 'pendiente',
        fechaHora: new Date('2026-08-10T09:00:00'),
        medicoId: 'med-1',
        updatedAt: new Date(),
      },
    });

    await waitlistService.aceptar('o1');

    // fire-and-forget vía import dinámico → esperar microtasks
    await vi.waitFor(() => expect(mockNotificar).toHaveBeenCalledTimes(1));
    expect(mockNotificar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 't1',
        pacienteId: 'pNuevo',
        fechaHora: new Date('2026-08-10T09:00:00'),
        medicoId: 'med-1',
      }),
      'pViejo',
    );
  });
});
