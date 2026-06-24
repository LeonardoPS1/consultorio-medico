import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCredenciales,
  getAllCredencialesMasked,
  getCredencialesByServicio,
  saveServicioCredenciales,
  deleteServicioCredenciales,
  deleteCredencial,
  SERVICIOS_CONFIG,
} from '@/lib/credential-store';
import { testCredentialConnection, getN8nCredentials } from '@/lib/n8n-sync';
import { logAudit } from '@/lib/audit-log';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, createCredencialSchema, updateCredencialSchema } from '@/lib/validations';

/**
 * GET /api/credenciales
 *
 * Query params:
 *   - servicio (opcional): filtrar por servicio
 *   - raw (opcional): si es "true", devuelve valores completos (solo admin)
 *
 * Respuesta:
 *   { credenciales: [...], servicios: [...] }
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  const servicio = searchParams.get('servicio');
  const raw = searchParams.get('raw') === 'true';

  const isAdmin = session.user?.role === 'admin';

  // Si pide raw y no es admin, denegar
  if (raw && !isAdmin) {
    fail('Solo administradores pueden ver valores completos', 403);
  }

  let credenciales;

  if (servicio) {
    // Devolver credenciales de un servicio específico
    credenciales = await getCredencialesByServicio(servicio);
    return NextResponse.json({
      servicio,
      credenciales,
      config: SERVICIOS_CONFIG.find((s) => s.servicio === servicio) || null,
    });
  }

  if (raw && isAdmin) {
    credenciales = await getAllCredenciales();
  } else {
    credenciales = await getAllCredencialesMasked();
  }

  // Agrupar por servicio para facilitar el frontend
  const grouped: Record<string, { servicio: string; config: unknown; credenciales: Record<string, string | null> }> = {};
  for (const c of credenciales) {
    if (!grouped[c.servicio]) {
      const config = SERVICIOS_CONFIG.find((s) => s.servicio === c.servicio);
      grouped[c.servicio] = {
        servicio: c.servicio,
        config: config || null,
        credenciales: {},
      };
    }
    grouped[c.servicio].credenciales[c.clave] = c.valor;
  }

  return NextResponse.json({
    credenciales,
    grouped: Object.values(grouped),
    servicios: SERVICIOS_CONFIG,
    isAdmin,
  });
});

/**
 * POST /api/credenciales
 *
 * Sólo admin. Crea o actualiza todas las credenciales de un servicio.
 *
 * Body:
 * {
 *   servicio: "twilio",
 *   credenciales: {
 *     account_sid: "AC...",
 *     auth_token: "...",
 *     whatsapp_number: "whatsapp:+..."
 *   },
 *   n8nCredentialId: "abc123"  // opcional
 * }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    fail('Solo administradores', 403);
  }

  const body = await request.json();
  const { servicio, credenciales, n8nCredentialId } = body;

  if (!servicio) {
    fail('Falta el campo "servicio"');
  }

  if (!credenciales || typeof credenciales !== 'object') {
    fail('Falta el campo "credenciales"');
  }

  // Validar que el servicio exista
  const config = SERVICIOS_CONFIG.find((s) => s.servicio === servicio);
  if (!config) {
    fail(`Servicio "${servicio}" no reconocido`);
  }

  // Guardar y sincronizar
  const result = await saveServicioCredenciales(servicio, credenciales, n8nCredentialId);

  // Auditar cambio de credenciales
  const campos = Object.keys(credenciales).join(', ');
  logAudit({
    usuarioId: session.user?.id,
    usuarioEmail: session.user?.email || undefined,
    usuarioNombre: session.user?.name || undefined,
    accion: 'config',
    entidad: 'credencial',
    entidadId: servicio,
    detalle: `Credenciales actualizadas: ${campos}`,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    servicio,
    credenciales: result.credenciales.map((c) => ({
      ...c,
      valor: undefined, // No devolver valores por seguridad
    })),
    n8nSync: result.n8nSyncResult,
  });
});

/**
 * DELETE /api/credenciales
 *
 * Sólo admin. Elimina credenciales.
 *
 * Query params:
 *   - servicio (requerido): servicio a eliminar
 *   - clave (opcional): si se especifica, elimina solo esa clave
 */
export const DELETE = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    fail('Solo administradores', 403);
  }

  const { searchParams } = new URL(request.url);
  const servicio = searchParams.get('servicio');
  const clave = searchParams.get('clave');

  if (!servicio) {
    fail('Falta el parámetro "servicio"');
  }

  if (clave) {
    await deleteCredencial(servicio!, clave);
  } else {
    await deleteServicioCredenciales(servicio!);
  }

  // Auditar eliminación de credenciales
  logAudit({
    usuarioId: session.user?.id,
    usuarioEmail: session.user?.email || undefined,
    usuarioNombre: session.user?.name || undefined,
    accion: 'delete',
    entidad: 'credencial',
    entidadId: servicio!,
    detalle: clave ? `Clave eliminada: ${clave}` : `Servicio completo eliminado: ${servicio!}`,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  }).catch(() => {});

  return ok({ success: true });
});

/**
 * PATCH /api/credenciales?action=test
 *
 * Prueba la conexión con un servicio.
 *
 * Body:
 * {
 *   servicio: "ollama",
 *   credenciales: { base_url: "http://..." }
 * }
 */
export const PATCH = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'test') {
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      fail('Solo administradores', 403);
    }

    const body = await request.json();
    const { servicio, credenciales } = body;

    if (!servicio || !credenciales) {
      fail('Faltan parámetros');
    }

    const result = await testCredentialConnection(servicio, credenciales);
    return NextResponse.json(result);
  }

  if (action === 'n8n-status') {
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      fail('Solo administradores', 403);
    }

    const result = await getN8nCredentials();
    return NextResponse.json(result);
  }

  fail('Acción no reconocida');
});
