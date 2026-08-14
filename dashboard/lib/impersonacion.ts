/**
 * Helpers de impersonación — generación de tokens de acceso de soporte.
 * Compartidos entre el flujo con email (aprobación del admin) y el flujo directo
 * (el operador de ops-console entra sin aprobación previa).
 */
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { usuarios, impersonationTokens } from '@/drizzle/schema';
import { db } from '@/lib/db';

// MOTIVO_MIN_LENGTH debe mantenerse en sync con ops-console/lib/validation.ts
export const MOTIVO_MIN_LENGTH = 10
export const MOTIVO_MAX_LENGTH = 500

export interface AdminImpersonado {
  id: string;
  email: string;
  nombre: string;
  plan: string | null;
}

export interface TokenImpersonacion {
  admin: AdminImpersonado;
  impersonateLink: string;
  expiresAt: Date;
}

/**
 * Busca el admin activo de un tenant y crea un token de impersonación de un solo uso (1 hora).
 * @param params - tenantId del tenant a impersonar, operatorId/operatorEmail del operador de soporte.
 * @param params.tenantId
 * @param params.operatorId
 * @param params.operatorEmail
 * @param params.motivo - Motivo obligatorio de la impersonación
 * @returns {Promise<TokenImpersonacion | null>} Los datos del admin, el link de acceso y la expiración; o null si no hay admin activo.
 */
export async function crearTokenImpersonacion(params: {
  tenantId: string;
  operatorId: string;
  operatorEmail: string;
  motivo: string;
}): Promise<TokenImpersonacion | null> {
  const { tenantId, operatorId, operatorEmail, motivo } = params;

  if (!motivo || motivo.trim().length === 0) {
    throw new Error('El motivo es obligatorio para crear un token de impersonación')
  }

  if (motivo.trim().length < MOTIVO_MIN_LENGTH) {
    throw new Error(`El motivo debe tener al menos ${MOTIVO_MIN_LENGTH} caracteres`)
  }

  const [admin] = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      plan: usuarios.plan,
    })
    .from(usuarios)
    .where(
      and(eq(usuarios.tenantId, tenantId), eq(usuarios.rol, 'admin'), eq(usuarios.activo, true)),
    )
    .limit(1);

  if (!admin) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await db.insert(impersonationTokens).values({
    id: crypto.randomUUID(),
    tenantId,
    usuarioId: admin.id,
    creadoPorOperatorId: operatorId,
    creadoPorOperatorEmail: operatorEmail,
    motivo: motivo.trim(),
    token,
    usado: false,
    expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
  const impersonateLink = `${baseUrl}/api/auth/impersonate?token=${token}`;

  return { admin, impersonateLink, expiresAt };
}
