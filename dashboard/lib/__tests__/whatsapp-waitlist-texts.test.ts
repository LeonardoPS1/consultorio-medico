import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de los textos WhatsApp de la Lista de Espera V2
 * (lib/whatsapp-waitlist.ts).
 *
 * Verifica los mensajes nuevos de:
 * 1. notificarOfertaTurno — "🎯 Te ofrecemos un turno disponible con el Dr. {medico}"
 * 2. notificarPacienteReasignado — "📢 ... fue reasignado a otro paciente"
 * 3. notificarConfirmacionReasignacion — "✅ Turno confirmado — {fecha} a las {hora}".
 *
 * Sigue el patrón mock de whatsapp-waitlist-response.test.ts.
 */

// ─── Mocks (vi.hoisted para poder usarlos en vi.mock) ──

const h = vi.hoisted(() => {
  const mocksWhatsApp = vi.fn().mockResolvedValue(true);
  const mockSafeLog = vi.fn();
  const mockSafeWarn = vi.fn();
  const mockSafeError = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn(() => ({
    set: () => ({ where: () => Promise.resolve() }),
  }));
  const rowsByTable = new Map<object, unknown[]>();
  // Tablas de drizzle (identity única por objeto)
  const turnos = { id: 'turnos' };
  const pacientes = { id: 'pacientes' };
  const medicos = { id: 'medicos' };
  const ofertasTurno = { id: 'ofertasTurno' };
  const listaEspera = { id: 'listaEspera' };
  return {
    mocksWhatsApp,
    mockSafeLog,
    mockSafeWarn,
    mockSafeError,
    mockSelect,
    mockUpdate,
    rowsByTable,
    turnos,
    pacientes,
    medicos,
    ofertasTurno,
    listaEspera,
  };
});

vi.mock('@/drizzle/schema', () => ({
  turnos: h.turnos,
  pacientes: h.pacientes,
  medicos: h.medicos,
  ofertasTurno: h.ofertasTurno,
  listaEspera: h.listaEspera,
}));

vi.mock('@/lib/whatsapp', () => ({ sendWhatsApp: h.mocksWhatsApp }));
vi.mock('@/lib/logger', () => ({
  safeLog: h.mockSafeLog,
  safeWarn: h.mockSafeWarn,
  safeError: h.mockSafeError,
}));
vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect, update: h.mockUpdate } }));

const ROWS = h.rowsByTable;
const mockSelect = h.mockSelect;
const mockUpdate = h.mockUpdate;
const mocksWhatsApp = h.mocksWhatsApp;
const turnos = h.turnos;
const pacientes = h.pacientes;
const medicos = h.medicos;
const ofertasTurno = h.ofertasTurno;
const listaEspera = h.listaEspera;

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

// ─── Fixtures ──────────────────────────────────────────

function setupSujetos() {
  ROWS.set(turnos, [{ id: 't1', fechaHora: new Date('2026-08-10T09:00:00') }]);
  ROWS.set(listaEspera, [{ id: 'le1', pacienteId: 'p1', medicoId: 'm1' }]);
  ROWS.set(ofertasTurno, [{ id: 'o1' }]);
  ROWS.set(pacientes, [
    {
      id: 'p1',
      nombre: 'Ana',
      apellido: 'Perez',
      telefono: '+56911111111',
      consentimientoWhatsapp: true,
    },
  ]);
  ROWS.set(medicos, [{ id: 'm1', nombre: 'García', whatsapp: '+56922222222' }]);
}

import { notificarOfertaTurno, notificarPacienteReasignado, notificarConfirmacionReasignacion } from '@/lib/whatsapp-waitlist';

describe('whatsapp-waitlist — textos "turno ofrecido" + reasignación', () => {
  beforeEach(() => {
    mocksWhatsApp.mockClear();
    h.mockSafeLog.mockClear();
    h.mockSafeWarn.mockClear();
    h.mockSafeError.mockClear();
    mockSelect.mockClear();
    mockUpdate.mockClear();
    ROWS.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('notificarOfertaTurno envía el mensaje nuevo con "Te ofrecemos un turno disponible"', async () => {
    setupSujetos();

    await notificarOfertaTurno('o1', 't1', 'le1');

    expect(mocksWhatsApp).toHaveBeenCalledTimes(1);
    expect(mocksWhatsApp).toHaveBeenCalledWith({
      to: '+56911111111',
      body: expect.stringContaining('Te ofrecemos un turno disponible con el Dr. García'),
      conversationId: undefined,
    });
    const body = String(mocksWhatsApp.mock.calls[0][0].body);
    expect(body).toContain('ACEPTAR');
    expect(body).toContain('RECHAZAR');
    expect(body).toContain('Tenés 15 minutos');
  });

  it('notificarPacienteReasignado envía mensaje con "reasignado" al paciente desplazado', async () => {
    ROWS.set(pacientes, [{ id: 'pX', nombre: 'Maria', telefono: '+56933333333' }]);
    ROWS.set(medicos, [{ id: 'm1', nombre: 'García', whatsapp: '+56922222222' }]);

    const result = await notificarPacienteReasignado(
      { pacienteId: 'p2', fechaHora: new Date('2026-08-10T09:00:00'), medicoId: 'm1' },
      'pX',
    );

    expect(result).toBe(true);
    expect(mocksWhatsApp).toHaveBeenCalledTimes(1);
    expect(mocksWhatsApp).toHaveBeenCalledWith({
      to: '+56933333333',
      body: expect.stringContaining('fue reasignado a otro paciente'),
    });
    const body = String(mocksWhatsApp.mock.calls[0][0].body);
    expect(body).toContain('reasignado');
    expect(body).toContain('Dr. García');
    expect(body).toContain('Maria');
  });

  it('notificarConfirmacionReasignacion envía "Turno confirmado"', async () => {
    setupSujetos();

    await notificarConfirmacionReasignacion('t1', 'p1', 42);

    expect(mocksWhatsApp).toHaveBeenCalledTimes(1);
    expect(mocksWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+56911111111', conversationId: 42 }),
    );
    const body = String(mocksWhatsApp.mock.calls[0][0].body);
    expect(body).toContain('Turno confirmado');
  });
});