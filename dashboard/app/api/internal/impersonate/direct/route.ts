import { NextResponse } from 'next/server';
import { crearTokenImpersonacion } from '@/lib/impersonacion';
import { safeLog } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

/**
 * Flujo directo: el operador de ops-console entra al dashboard del tenant
 * SIN aprobación previa del admin por email. Siempre devuelve el link de acceso.
 * El email queda como canal alternativo en el flujo original (/api/internal/impersonate).
 * @param request
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantId, operatorId, operatorEmail, motivo } = body;

    if (!tenantId || !operatorId || !operatorEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: tenantId, operatorId, operatorEmail' },
        { status: 400 },
      );
    }

    if (!motivo || typeof motivo !== 'string' || motivo.trim().length === 0) {
      return NextResponse.json({ error: 'El motivo es obligatorio' }, { status: 400 });
    }

    const tokenInfo = await crearTokenImpersonacion({ tenantId, operatorId, operatorEmail, motivo: motivo.trim() });

    if (!tokenInfo) {
      return NextResponse.json(
        { error: 'No se encontró un administrador activo para este tenant' },
        { status: 404 },
      );
    }

    safeLog(
      `[Impersionate/Direct] Token creado para tenant ${tenantId}, admin ${tokenInfo.admin.email}`,
    );

    return NextResponse.json({
      ok: true,
      adminEmail: tokenInfo.admin.email,
      adminNombre: tokenInfo.admin.nombre,
      impersonateLink: tokenInfo.impersonateLink,
      expiresAt: tokenInfo.expiresAt.toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
