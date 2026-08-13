import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { impersonationTokens } from '@/drizzle/schema';
import { db } from '@/lib/db';

export interface ImpersonationSession {
  sub: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  tenantId: string;
  impersonating: true;
  impersonatedBy: string;
  jti?: string;
}

const COOKIE_NAME_PROD = '__Secure-impersonation.session';
const COOKIE_NAME_DEV = 'impersonation.session';
const SESSION_HOURS = 2;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no configurado');
  return new TextEncoder().encode(secret);
}

function getCookieName(): string {
  return process.env.NODE_ENV === 'production' ? COOKIE_NAME_PROD : COOKIE_NAME_DEV;
}

/**
 * Crea y firma un JWT de impersonación.
 * @param {ImpersonationSession} session - Datos de la sesión de impersonación.
 * @returns {Promise<string>} Token JWT firmado.
 */
export async function createImpersonationToken(session: ImpersonationSession): Promise<string> {
  const secret = getSecret();
  const { jti, ...claims } = session;
  const builder = new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`);
  if (jti) builder.setJti(jti);
  const token = await builder.sign(secret);
  return token;
}

/**
 * Verifica si una sesión de impersonación fue revocada por su jti.
 * @param {string} jti - Identificador único del JWT.
 * @returns {Promise<boolean>} true si la sesión está revocada.
 */
export async function isImpersonationSessionRevoked(jti: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ sessionRevokedAt: impersonationTokens.sessionRevokedAt })
      .from(impersonationTokens)
      .where(eq(impersonationTokens.sessionJti, jti))
      .limit(1);
    return !!row?.sessionRevokedAt;
  } catch {
    return false;
  }
}

/**
 * Verifica y valida un token JWT de impersonación.
 * @param {string} token - Token JWT a verificar.
 * @returns {Promise<ImpersonationSession | null>} Sesión impersonada o null si es inválido.
 */
export async function verifyImpersonationToken(token: string): Promise<ImpersonationSession | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const data = payload as unknown as ImpersonationSession;
    if (!data.impersonating) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Genera el token y lo guarda en la cookie de impersonación.
 * @param {ImpersonationSession} session - Datos de la sesión de impersonación.
 * @returns {Promise<string>} Token JWT guardado en la cookie.
 */
export async function setImpersonationCookie(session: ImpersonationSession): Promise<string> {
  const token = await createImpersonationToken(session);
  const cookieStore = await cookies();
  cookieStore.set(getCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
  return token;
}

/**
 * Lee y valida la cookie de impersonación activa.
 * @returns {Promise<ImpersonationSession | null>} Sesión impersonada o null si no existe.
 */
export async function getImpersonationSession(): Promise<ImpersonationSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(getCookieName());
    if (!cookie?.value) return null;
    const data = await verifyImpersonationToken(cookie.value);
    if (!data) {
      cookieStore.delete(getCookieName());
      return null;
    }
    // Revoque de sesión: si el JWT trae jti y la sesión fue revocada, invalidar
    if (data.jti && (await isImpersonationSessionRevoked(data.jti))) {
      cookieStore.delete(getCookieName());
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Elimina la cookie de impersonación.
 */
export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName());
}

/**
 * Verifica si la request trae la cookie de impersonación.
 * @param {{ cookies: { get: (name: string) => { value?: string } | undefined } }} request - Objeto con acceso a cookies.
 * @param {object} request.cookies - API de lectura de cookies de la request.
 * @param {{ (name: string): { value?: string } | undefined }} request.cookies.get - Función para obtener una cookie por nombre.
 * @returns {boolean} true si existe la cookie de impersonación.
 */
export function hasImpersonationCookie(request: { cookies: { get: (name: string) => { value?: string } | undefined } }): boolean {
  return !!request.cookies.get(getCookieName());
}
