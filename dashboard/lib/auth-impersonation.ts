import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface ImpersonationSession {
  sub: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  tenantId: string;
  impersonating: true;
  impersonatedBy: string;
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

export async function createImpersonationToken(session: ImpersonationSession): Promise<string> {
  const secret = getSecret();
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret);
  return token;
}

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
    return data;
  } catch {
    return null;
  }
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName());
}

export function hasImpersonationCookie(request: { cookies: { get: (name: string) => { value?: string } | undefined } }): boolean {
  return !!request.cookies.get(getCookieName());
}
