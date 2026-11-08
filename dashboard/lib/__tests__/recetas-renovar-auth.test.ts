import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests de autorización del endpoint de renovación de recetas.
 *
 * Reglas cubiertas:
 * - Solo `admin` y `medico` pueden renovar (recepción/staff quedan fuera).
 * - Un `medico` solo renueva sus propias recetas y debe tener `medicoId` en sesión.
 * - Una receta de otro tenant responde 404 (no revela existencia).
 * - Estados terminales no se renuevan (400).
 */

const state = vi.hoisted(() => ({
  session: null as
    | null
    | { user: { role?: string; tenantId?: string | null; medicoId?: string | null } },
  receta: null as null | Record<string, unknown>,
  renovar: vi.fn(async () => ({ id: 'receta-nueva' })),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAuth: async () => state.session,
}));

vi.mock('@/lib/db', () => {
  const buildChain = (): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};
    builder.from = () => builder;
    builder.leftJoin = () => builder;
    builder.where = () => builder;
    builder.limit = () => Promise.resolve(state.receta ? [state.receta] : []);
    return builder;
  };
  return { db: { select: () => buildChain() } };
});

vi.mock('@/lib/services/recetas', () => ({
  recetasService: { renovar: state.renovar },
}));

vi.mock('@/lib/data-cache', () => ({
  CACHE_TAGS: { RECETAS: 'recetas', PACIENTES: 'pacientes', DASHBOARD_STATS: 'dashboard' },
  revalidate: vi.fn(),
}));

vi.mock('@/lib/rls', () => ({
  withTenantScope: async () => null,
}));

vi.mock('@/lib/glitchtip', () => ({
  captureError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  safeError: vi.fn(),
}));

import { POST } from '@/app/api/recetas/[id]/renovar/route';

const TENANT = '11111111-1111-1111-1111-111111111111';
const MEDICO = '44444444-4444-4444-4444-444444444444';

/**
 * Ejecuta el handler con un id de receta dado.
 * @param id Identificador de la receta
 * @returns {Promise<NextResponse>} Respuesta del handler
 */
async function ejecutar(id = 'receta-1'): Promise<Response> {
  const request = new NextRequest(`http://localhost/api/recetas/${id}/renovar`, {
    method: 'POST',
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  state.session = null;
  state.receta = null;
  state.renovar.mockClear();
});

describe('POST /api/recetas/[id]/renovar — autorización', () => {
  it('rechaza una sesión sin rol permitido', async () => {
    state.session = { user: { role: 'recepcionista', tenantId: TENANT } };
    const res = await ejecutar();
    expect(res.status).toBe(403);
    expect(state.renovar).not.toHaveBeenCalled();
  });

  it('rechaza una sesión inexistente', async () => {
    const res = await ejecutar();
    expect(res.status).toBe(403);
    expect(state.renovar).not.toHaveBeenCalled();
  });

  it('responde 404 cuando la receta no existe', async () => {
    state.session = { user: { role: 'admin', tenantId: TENANT } };
    state.receta = null;
    const res = await ejecutar();
    expect(res.status).toBe(404);
    expect(state.renovar).not.toHaveBeenCalled();
  });

  it('responde 404 cuando la receta pertenece a otro tenant', async () => {
    state.session = { user: { role: 'admin', tenantId: TENANT } };
    state.receta = {
      id: 'receta-1',
      medicoId: MEDICO,
      estado: 'emitida',
      tenantPaciente: 'otro-tenant',
      tenantMedico: 'otro-tenant',
    };
    const res = await ejecutar();
    expect(res.status).toBe(404);
    expect(state.renovar).not.toHaveBeenCalled();
  });

  it('rechaza a un médico sin medicoId en sesión', async () => {
    state.session = { user: { role: 'medico', tenantId: TENANT, medicoId: null } };
    state.receta = {
      id: 'receta-1',
      medicoId: MEDICO,
      estado: 'emitida',
      tenantPaciente: TENANT,
      tenantMedico: TENANT,
    };
    const res = await ejecutar();
    expect(res.status).toBe(403);
    expect(state.renovar).not.toHaveBeenCalled();
  });

  it('rechaza a un médico que intenta renovar la receta de otro médico', async () => {
    state.session = {
      user: { role: 'medico', tenantId: TENANT, medicoId: 'otro-medico' },
    };
    state.receta = {
      id: 'receta-1',
      medicoId: MEDICO,
      estado: 'emitida',
      tenantPaciente: TENANT,
      tenantMedico: TENANT,
    };
    const res = await ejecutar();
    expect(res.status).toBe(403);
    expect(state.renovar).not.toHaveBeenCalled();
  });

  it('permite al médico dueño renovar su receta', async () => {
    state.session = { user: { role: 'medico', tenantId: TENANT, medicoId: MEDICO } };
    state.receta = {
      id: 'receta-1',
      medicoId: MEDICO,
      estado: 'emitida',
      tenantPaciente: TENANT,
      tenantMedico: TENANT,
    };
    const res = await ejecutar();
    expect(res.status).toBe(200);
    expect(state.renovar).toHaveBeenCalledWith('receta-1', MEDICO);
  });

  it('permite al admin renovar dentro de su tenant', async () => {
    state.session = { user: { role: 'admin', tenantId: TENANT } };
    state.receta = {
      id: 'receta-1',
      medicoId: MEDICO,
      estado: 'emitida',
      tenantPaciente: TENANT,
      tenantMedico: TENANT,
    };
    const res = await ejecutar();
    expect(res.status).toBe(200);
    expect(state.renovar).toHaveBeenCalledWith('receta-1', undefined);
  });

  it('rechaza renovar una receta en estado no renovable', async () => {
    state.session = { user: { role: 'admin', tenantId: TENANT } };
    state.receta = {
      id: 'receta-1',
      medicoId: MEDICO,
      estado: 'anulada',
      tenantPaciente: TENANT,
      tenantMedico: TENANT,
    };
    const res = await ejecutar();
    expect(res.status).toBe(400);
    expect(state.renovar).not.toHaveBeenCalled();
  });
});
