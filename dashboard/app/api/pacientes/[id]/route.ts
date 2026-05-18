import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getPacienteDetalle, updatePacienteDetalle } from '@/lib/patient-store';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit-log';

/** Verifica que haya una sesión activa. Retorna 401 si no. */
function requireAuth(session: Session | null): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'No autorizado. Iniciá sesión para acceder.' },
      { status: 401 }
    );
  }
  return null;
}

/** Extrae metadatos para auditoría desde request + sesión */
function getAuditMetadata(req: NextRequest, session: Session | null) {
  return {
    usuarioId: session?.user?.id || undefined,
    usuarioEmail: session?.user?.email || undefined,
    usuarioNombre: session?.user?.name || undefined,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const authError = requireAuth(session);
    if (authError) return authError;

    const data = getPacienteDetalle(params.id);

    if (!data) {
      return NextResponse.json({ error: 'Paciente no encontrado.' }, { status: 404 });
    }

    // Auditar acceso a datos médicos
    logAudit({
      ...getAuditMetadata(_req, session),
      accion: 'view',
      entidad: 'paciente',
      entidadId: params.id,
    }).catch(() => {});

    return NextResponse.json({ data });
  } catch (e) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : (e as Error).message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const authError = requireAuth(session);
    if (authError) return authError;

    const body = await request.json();

    // Validar que el body no esté vacío
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Body inválido. Enviá al menos un campo.' }, { status: 400 });
    }

    const updated = updatePacienteDetalle(params.id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Paciente no encontrado.' }, { status: 404 });
    }

    // Auditar modificación de datos médicos
    logAudit({
      ...getAuditMetadata(request, session),
      accion: 'edit',
      entidad: 'paciente',
      entidadId: params.id,
      detalle: `Campos modificados: ${Object.keys(body).join(', ')}`,
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (e) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : (e as Error).message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
