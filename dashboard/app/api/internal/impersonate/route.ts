import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { impersonationTokens } from '@/drizzle/schema';
import { usuarios } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/services/email';
import { safeLog, safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.NOVEDADES_INTERNAL_KEY;

const IMPERSONATION_DURATION_SECONDS = 3600;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { tenantId, tenantName, motivo, creadoPor, creadoPorNombre } = await request.json();
  if (!tenantId || !motivo || !creadoPor) {
    return NextResponse.json({ error: 'Faltan campos: tenantId, motivo, creadoPor' }, { status: 400 });
  }

  try {
    const expiresAt = new Date(Date.now() + IMPERSONATION_DURATION_SECONDS * 1000);

    const [result] = await db
      .insert(impersonationTokens)
      .values({
        tenantId,
        tenantName: tenantName || '',
        creadoPor,
        creadoPorNombre: creadoPorNombre || creadoPor,
        motivo,
        expiresAt,
      })
      .returning({ token: impersonationTokens.token });

    if (!result) {
      return NextResponse.json({ error: 'Error al crear token' }, { status: 500 });
    }

    // Fire-and-forget: notificar admin del tenant por email
    notifyTenantAdmin(tenantId, creadoPorNombre || creadoPor, motivo).catch(() => {});

    safeLog(`[Impersonate] Token creado por ${creadoPor} para tenant ${tenantName || tenantId}`);

    return NextResponse.json({
      token: result.token,
      expiresIn: IMPERSONATION_DURATION_SECONDS,
      dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com',
    });
  } catch (e) {
    safeWarn('[Impersonate] Error:', (e as Error).message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function notifyTenantAdmin(tenantId: string, operatorName: string, motivo: string) {
  try {
    const [admin] = await db
      .select({ email: usuarios.email, nombre: usuarios.nombre })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.tenantId, tenantId),
          eq(usuarios.rol, 'admin'),
          isNull(usuarios.deletedAt),
        ),
      )
      .limit(1);

    if (!admin?.email) return;

    const fecha = new Date().toLocaleString('es-CL', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    await sendEmail({
      to: admin.email,
      subject: `🔍 Acceso de soporte AicoreMed a ${admin.nombre || 'tu panel'}`,
      text: `Hola ${admin.nombre || ''},

El equipo de soporte AicoreMed ha accedido a tu panel de administración.

Fecha: ${fecha}
Operador: ${operatorName}
Motivo: ${motivo}

Este acceso fue autorizado y queda registrado en nuestros logs de auditoría.
Si no autorizaste este acceso, contactanos inmediatamente a soporte@aicorebots.com.

Saludos,
Equipo AicoreMed`,
    });
  } catch (e) {
    safeWarn('[Impersonate] Error al notificar admin:', (e as Error).message);
  }
}
