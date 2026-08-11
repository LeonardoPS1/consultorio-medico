import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { pacientes, sucursales, usuarios, solicitudesDatos } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { safeWarn } from '@/lib/logger';
import { getPortalSession, validateCSRFOrigin } from '@/lib/portal-auth';
import { sendEmail } from '@/lib/services/email';

export const dynamic = 'force-dynamic';

/**
 *
 * @param request
 */
export async function POST(request: Request) {
  if (!validateCSRFOrigin(request)) {
    return NextResponse.json({ error: 'Origen no válido' }, { status: 403 });
  }

  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const [paciente] = await db
      .select()
      .from(pacientes)
      .where(eq(pacientes.id, session.pacienteId))
      .limit(1);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    let tenantId: string = '00000000-0000-0000-0000-000000000000';
    if (paciente.sucursalId) {
      const [sucursal] = await db
        .select({ tenantId: sucursales.tenantId })
        .from(sucursales)
        .where(eq(sucursales.id, paciente.sucursalId))
        .limit(1);
      if (sucursal) tenantId = sucursal.tenantId;
    }

    const [solicitud] = await db
      .insert(solicitudesDatos)
      .values({
        pacienteId: session.pacienteId,
        tipo: 'eliminacion',
        estado: 'pendiente',
        tenantId,
      })
      .returning({ id: solicitudesDatos.id, createdAt: solicitudesDatos.createdAt });

    const admin = await db
      .select({ email: usuarios.email, nombre: usuarios.nombre })
      .from(usuarios)
      .where(and(eq(usuarios.tenantId, tenantId), eq(usuarios.rol, 'admin'), eq(usuarios.activo, true)))
      .limit(1);

    if (admin.length > 0) {
      const nombrePaciente = `${paciente.nombre} ${paciente.apellido}`.trim();
      await sendEmail({
        to: admin[0].email,
        subject: 'Solicitud de eliminación de datos — AicoreMed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2563eb;">Solicitud de eliminación de datos</h2>
            <p>El paciente <strong>${nombrePaciente}</strong> (${paciente.email || paciente.telefono}) ha solicitado la eliminación de sus datos personales conforme a la Ley 19.628.</p>
            <p><strong>Fecha de solicitud:</strong> ${solicitud.createdAt.toISOString()}</p>
            <p><strong>ID de solicitud:</strong> ${solicitud.id}</p>
            <p>Esta solicitud requiere <strong>revisión manual</strong>. No se eliminan datos automáticamente. Revisa la solicitud en el panel de administración de tu clínica y decide cómo proceder.</p>
          </div>
        `,
      });
    } else {
      safeWarn('Solicitud de eliminación: no se encontró admin del tenant para notificar', { tenantId });
    }

    return NextResponse.json({ ok: true, solicitudId: solicitud.id });
  } catch (err) {
    safeWarn('Error al solicitar eliminación de datos', err);
    return NextResponse.json({ error: 'No se pudo registrar la solicitud' }, { status: 500 });
  }
}
