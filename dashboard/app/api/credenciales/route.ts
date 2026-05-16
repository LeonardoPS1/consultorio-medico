import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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

/**
 * Verifica que el usuario sea admin.
 * Los usuarios no-admin solo pueden LEER credenciales (enmascaradas).
 */
async function checkAdmin(): Promise<{ isAdmin: boolean; error?: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { isAdmin: false, error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const role = (session.user as any)?.role;
  if (role !== 'admin') {
    return { isAdmin: false, error: NextResponse.json({ error: 'Solo administradores' }, { status: 403 }) };
  }
  return { isAdmin: true };
}

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
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const servicio = searchParams.get('servicio');
    const raw = searchParams.get('raw') === 'true';

    const session = await auth();
    const isAdmin = (session?.user as any)?.role === 'admin';

    // Si pide raw y no es admin, denegar
    if (raw && !isAdmin) {
      return NextResponse.json({ error: 'Solo administradores pueden ver valores completos' }, { status: 403 });
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
    const grouped: Record<string, any> = {};
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
  } catch (error) {
    console.error('[Credenciales API] Error GET:', error);
    return NextResponse.json({ error: 'Error al obtener credenciales' }, { status: 500 });
  }
}

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
 *
 * Respuesta:
 *   { success: true, credenciales: [...], n8nSync: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdmin();
    if (!isAdmin) return error;

    const body = await request.json();
    const { servicio, credenciales, n8nCredentialId } = body;

    if (!servicio) {
      return NextResponse.json({ error: 'Falta el campo "servicio"' }, { status: 400 });
    }

    if (!credenciales || typeof credenciales !== 'object') {
      return NextResponse.json({ error: 'Falta el campo "credenciales"' }, { status: 400 });
    }

    // Validar que el servicio exista
    const config = SERVICIOS_CONFIG.find((s) => s.servicio === servicio);
    if (!config) {
      return NextResponse.json({ error: `Servicio "${servicio}" no reconocido` }, { status: 400 });
    }

    // Guardar y sincronizar
    const result = await saveServicioCredenciales(servicio, credenciales, n8nCredentialId);

    return NextResponse.json({
      success: true,
      servicio,
      credenciales: result.credenciales.map((c) => ({
        ...c,
        valor: undefined, // No devolver valores por seguridad
      })),
      n8nSync: result.n8nSyncResult,
    });
  } catch (error) {
    console.error('[Credenciales API] Error POST:', error);
    return NextResponse.json({ error: 'Error al guardar credenciales' }, { status: 500 });
  }
}

/**
 * DELETE /api/credenciales
 *
 * Sólo admin. Elimina credenciales.
 *
 * Query params:
 *   - servicio (requerido): servicio a eliminar
 *   - clave (opcional): si se especifica, elimina solo esa clave
 */
export async function DELETE(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdmin();
    if (!isAdmin) return error;

    const { searchParams } = new URL(request.url);
    const servicio = searchParams.get('servicio');
    const clave = searchParams.get('clave');

    if (!servicio) {
      return NextResponse.json({ error: 'Falta el parámetro "servicio"' }, { status: 400 });
    }

    if (clave) {
      await deleteCredencial(servicio, clave);
    } else {
      await deleteServicioCredenciales(servicio);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Credenciales API] Error DELETE:', error);
    return NextResponse.json({ error: 'Error al eliminar credenciales' }, { status: 500 });
  }
}

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
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'test') {
      const { isAdmin, error } = await checkAdmin();
      if (!isAdmin) return error;

      const body = await request.json();
      const { servicio, credenciales } = body;

      if (!servicio || !credenciales) {
        return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
      }

      const result = await testCredentialConnection(servicio, credenciales);
      return NextResponse.json(result);
    }

    if (action === 'n8n-status') {
      const { isAdmin, error } = await checkAdmin();
      if (!isAdmin) return error;

      const result = await getN8nCredentials();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('[Credenciales API] Error PATCH:', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}
