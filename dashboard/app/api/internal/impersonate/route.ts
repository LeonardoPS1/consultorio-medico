import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios, impersonationTokens } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { safeLog, safeWarn } from '@/lib/logger';
import { sendEmail } from '@/lib/services/email';
import crypto from 'crypto';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantId, operatorId, operatorEmail } = body;

    if (!tenantId || !operatorId || !operatorEmail) {
      return NextResponse.json({ error: 'Faltan campos requeridos: tenantId, operatorId, operatorEmail' }, { status: 400 });
    }

    // Buscar admin activo del tenant
    const [admin] = await db
      .select({ id: usuarios.id, email: usuarios.email, nombre: usuarios.nombre, plan: usuarios.plan })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.tenantId, tenantId),
          eq(usuarios.rol, 'admin'),
          eq(usuarios.activo, true),
        ),
      )
      .limit(1);

    if (!admin) {
      safeWarn(`[Impersionate] No se encontró admin activo para tenant ${tenantId}`);
      return NextResponse.json({ error: 'No se encontró un administrador activo para este tenant' }, { status: 404 });
    }

    // Generar token criptográfico + registro en DB
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.insert(impersonationTokens).values({
      id: crypto.randomUUID(),
      tenantId,
      usuarioId: admin.id,
      creadoPorOperatorId: operatorId,
      creadoPorOperatorEmail: operatorEmail,
      token,
      usado: false,
      expiresAt,
    });

    // Enviar email al admin
    const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
    const impersonateLink = `${baseUrl}/api/auth/impersonate?token=${token}`;

    const emailSent = await sendEmail({
      to: admin.email,
      subject: 'Acceso de soporte solicitado — AicoreMed',
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Acceso de soporte</h2>
          <p>Hola <strong>${admin.nombre}</strong>,</p>
          <p>Un operador de soporte ha solicitado acceder a tu panel de administración
            para asistirte con una consulta técnica.</p>
          <p style="margin: 24px 0;">
            <a href="${impersonateLink}"
               style="display: inline-block; padding: 12px 24px; background: #2563eb;
                      color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Acceder al panel
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Este enlace expira en 1 hora y solo funciona una vez.
            Si no solicitaste este acceso, podés ignorar este mensaje.
          </p>
        </div>
      `,
    });

    safeLog(`[Impersionate] Token creado para tenant ${tenantId}, admin ${admin.email}, email enviado: ${emailSent}`);

    return NextResponse.json({
      ok: true,
      adminEmail: admin.email,
      adminNombre: admin.nombre,
      emailSent,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    safeWarn('[Impersionate] Error:', (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
