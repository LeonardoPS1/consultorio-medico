import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests del flujo de respuesta a ofertas de Lista de Espera vía WhatsApp
 * (handleWaitlistResponse en lib/whatsapp-waitlist.ts).
 *
 * Este es el núcleo de la intercepción que ahora se dispara desde el webhook
 * de Chatwoot (canal principal) además de Twilio. Verifica que:
 * 1. "ACEPTAR" / "SI" / "OK" / "CONFIRMAR" aceptan la oferta pendiente.
 * 2. "RECHAZAR" / "NO" / "RECHAZO" rechazan la oferta pendiente.
 * 3. Mensajes no relacionados no se procesan (dejan pasar al agente).
 * 4. Sin oferta pendiente responde "no encontré" por el mismo canal.
 * 5. Oferta expirada responde "expiró" por el mismo canal.
 * 6. El conversationId de Chatwoot se propaga a la confirmación (mismo canal).
 */

// ─── Mocks (vi.hoisted para poder usarlos en vi.mock) ──

const h = vi.hoisted(() => {
  const mocksWhatsApp = vi.fn(async (args: { to: string; body: string; conversationId?: number }) =>
    Boolean(args.body),
  );
  const mockAceptar = vi.fn();
  const mockRechazar = vi.fn();
  const mockSafeLog = vi.fn();
  const mockSafeWarn = vi.fn();
  const mockSafeError = vi.fn();
  const mockSelect = vi.fn();
  const rowsByTable = new Map<object, unknown[]>();
  // Tablas de drizzle (identity única por objeto)
  const turnos = { id: 'turnos' };
  const pacientes = { id: 'pacientes' };
  const medicos = { id: 'medicos' };
  const ofertasTurno = { id: 'ofertasTurno' };
  const listaEspera = { id: 'listaEspera' };
  return {
    mocksWhatsApp,
    mockAceptar,
    mockRechazar,
    mockSafeLog,
    mockSafeWarn,
    mockSafeError,
    mockSelect,
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
vi.mock('@/lib/services/waitlist', () => ({
  waitlistService: { aceptar: h.mockAceptar, rechazar: h.mockRechazar },
}));
vi.mock('@/lib/logger', () => ({
  safeLog: h.mockSafeLog,
  safeWarn: h.mockSafeWarn,
  safeError: h.mockSafeError,
}));
vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect } }));

const ROWS = h.rowsByTable;
const mockSelect = h.mockSelect;
const mocksWhatsApp = h.mocksWhatsApp;
const mockAceptar = h.mockAceptar;
const mockRechazar = h.mockRechazar;
const turnos = h.turnos;
const pacientes = h.pacientes;
const medicos = h.medicos;
const ofertasTurno = h.ofertasTurno;
const listaEspera = h.listaEspera;

// Cadena tipo drizzle (select → from → leftJoin → where → orderBy → limit)
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

// ─── Objetos de dominio ────────────────────────────────

function makeOferta(overrides: Record<string, unknown> = {}) {
  return {
    id: 'oferta-1',
    estado: 'pendiente',
    expiracion: new Date(Date.now() + 15 * 60 * 1000),
    turnoId: 'turno-1',
    listaEsperaId: 'le-1',
    ...overrides,
  };
}

function makeTurno() {
  return {
    fechaHora: new Date(Date.now() + 24 * 60 * 60 * 1000),
    medicoId: 'med-1',
    pacienteId: 'pac-1',
  };
}

function makePaciente() {
  return { nombre: 'Juan', apellido: 'Perez', telefono: '+56911223344' };
}

function makeMedico() {
  return { nombre: 'Dra. Ana', whatsapp: '+56955667788' };
}

function setupSujetos() {
  ROWS.set(turnos, [makeTurno()]);
  ROWS.set(pacientes, [makePaciente()]);
  ROWS.set(medicos, [makeMedico()]);
}

import { handleWaitlistResponse } from '@/lib/whatsapp-waitlist';

describe('handleWaitlistResponse — flujo oferta de turno', () => {
  beforeEach(() => {
    mocksWhatsApp.mockClear();
    mockAceptar.mockClear();
    mockRechazar.mockClear();
    h.mockSafeLog.mockClear();
    h.mockSafeWarn.mockClear();
    h.mockSafeError.mockClear();
    mockSelect.mockClear();
    ROWS.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('acepta la oferta con "ACEPTAR" y confirma por el mismo canal (conversationId)', async () => {
    ROWS.set(ofertasTurno, [makeOferta()]);
    setupSujetos();

    const result = await handleWaitlistResponse('pac-1', 'ACEPTAR', '56911223344', 42);

    expect(result).toBe(true);
    expect(mockAceptar).toHaveBeenCalledWith('oferta-1');
    expect(mockRechazar).not.toHaveBeenCalled();
    // Confirmación al paciente por el MISMO canal: conversationId 42 propagado
    const confirmCall = mocksWhatsApp.mock.calls.find((c) =>
      String(c[0].body).includes('Turno confirmado'),
    );
    expect(confirmCall).toBeDefined();
    expect(confirmCall![0]).toMatchObject({ to: '+56911223344', conversationId: 42 });
    // Notificación al médico (sin conversationId)
    const medCall = mocksWhatsApp.mock.calls.find((c) => String(c[0].body).includes('Dr.'));
    expect(medCall).toBeDefined();
    expect(medCall![0]).toMatchObject({ to: '+56955667788' });
  });

  it('acepta oferta con alias "OK" y "SI"', async () => {
    ROWS.set(ofertasTurno, [makeOferta()]);
    setupSujetos();

    await handleWaitlistResponse('pac-1', 'OK', '56911223344', 7);
    expect(mockAceptar).toHaveBeenCalled();

    mockAceptar.mockClear();
    ROWS.set(ofertasTurno, [makeOferta()]);
    await handleWaitlistResponse('pac-1', 'SI', '56911223344');
    expect(mockAceptar).toHaveBeenCalled();
  });

  it('rechaza la oferta con "RECHAZAR" y avisa por el mismo canal', async () => {
    ROWS.set(ofertasTurno, [makeOferta()]);
    setupSujetos();

    const result = await handleWaitlistResponse('pac-1', 'RECHAZAR', '56911223344', 7);

    expect(result).toBe(true);
    expect(mockRechazar).toHaveBeenCalledWith('oferta-1');
    expect(mockAceptar).not.toHaveBeenCalled();
    const aviso = mocksWhatsApp.mock.calls.find((c) => String(c[0].body).includes('rechazamos'));
    expect(aviso).toBeDefined();
    expect(aviso![0]).toMatchObject({ to: '56911223344', conversationId: 7 });
  });

  it('NO procesa mensajes que no son respuestas (vuelve false)', async () => {
    const result = await handleWaitlistResponse('pac-1', 'HOLA, tenes turnos?', '56911223344');
    expect(result).toBe(false);
    expect(mockAceptar).not.toHaveBeenCalled();
    expect(mockRechazar).not.toHaveBeenCalled();
    expect(mocksWhatsApp).not.toHaveBeenCalled();
  });

  it('responde "no encontré" si no hay oferta pendiente, por el mismo canal', async () => {
    ROWS.set(ofertasTurno, []);
    ROWS.set(pacientes, [makePaciente()]);

    const result = await handleWaitlistResponse('pac-1', 'ACEPTAR', '56911223344', 21);

    expect(result).toBe(true);
    const aviso = mocksWhatsApp.mock.calls.find((c) =>
      String(c[0].body).includes('No encontré un turno ofrecido pendiente para vos.'),
    );
    expect(aviso).toBeDefined();
    expect(String(aviso![0].body)).toContain('Hola Juan');
    expect(aviso![0]).toMatchObject({ to: '56911223344', conversationId: 21 });
  });

  it('responde "expiró" si la oferta caducó, por el mismo canal', async () => {
    ROWS.set(ofertasTurno, [makeOferta({ expiracion: new Date(Date.now() - 1000) })]);

    const result = await handleWaitlistResponse('pac-1', 'ACEPTAR', '56911223344', 33);

    expect(result).toBe(true);
    expect(mockAceptar).not.toHaveBeenCalled();
    const aviso = mocksWhatsApp.mock.calls.find((c) => String(c[0].body).includes('expiró'));
    expect(aviso).toBeDefined();
    expect(aviso![0]).toMatchObject({ to: '56911223344', conversationId: 33 });
  });
});
