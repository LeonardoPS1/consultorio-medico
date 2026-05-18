import { NextRequest, NextResponse } from 'next/server';
import { getPacienteDetalle, updatePacienteDetalle } from '@/lib/patient-store';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit-log';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const data = getPacienteDetalle(params.id);

    // Auditar acceso a datos médicos
    logAudit({
      usuarioId: session?.user?.id,
      usuarioEmail: session?.user?.email || undefined,
      usuarioNombre: session?.user?.name || undefined,
      accion: 'view',
      entidad: 'paciente',
      entidadId: params.id,
      ip: _req.headers.get('x-forwarded-for') || _req.headers.get('x-real-ip') || undefined,
      userAgent: _req.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const body = await request.json();
    const updated = updatePacienteDetalle(params.id, body);

    // Auditar modificación de datos médicos
    logAudit({
      usuarioId: session?.user?.id,
      usuarioEmail: session?.user?.email || undefined,
      usuarioNombre: session?.user?.name || undefined,
      accion: 'edit',
      entidad: 'paciente',
      entidadId: params.id,
      detalle: `Campos modificados: ${Object.keys(body).join(', ')}`,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
