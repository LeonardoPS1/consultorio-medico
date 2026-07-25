import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

const SESSION_COOKIE = '__Secure-ops.session'
const SESSION_DURATION = 4 * 60 * 60 // 4 horas en segundos

export interface OpsSessionPayload extends JWTPayload {
  sub: string
  email: string
  nombre: string
  jti: string
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.OPS_JWT_SECRET
  if (!secret) throw new Error('OPS_JWT_SECRET no está configurada')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(
  operator: { id: string; email: string; nombre: string }
): Promise<{ token: string; jti: string; expiresAt: Date }> {
  const jti = uuidv4()
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = new Date((now + SESSION_DURATION) * 1000)

  const token = await new SignJWT({
    sub: operator.id,
    email: operator.email,
    nombre: operator.nombre,
    jti,
  } satisfies OpsSessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION)
    .setJti(jti)
    .sign(getJwtSecret())

  return { token, jti, expiresAt }
}

export async function verifySessionToken(token: string): Promise<OpsSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    })
    return payload as OpsSessionPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export async function getSessionFromCookie(): Promise<OpsSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
