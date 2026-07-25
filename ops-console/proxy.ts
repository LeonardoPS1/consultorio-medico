import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken } from './lib/auth'

const PUBLIC_PATHS = [
  '/api/auth/register/begin',
  '/api/auth/register/complete',
  '/api/auth/login/begin',
  '/api/auth/login/complete',
  '/api/auth/totp/setup',
  '/api/auth/totp/verify',
  '/api/auth/session',
  '/api/health',
  '/login',
  '/setup',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
]

const CROSS_TENANT_PATHS = [
  '/api/tenants',
  '/api/audit',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Static files: skip ────────────────────────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Auth check ─────────────────────────────────────────
  const token = request.cookies.get('__Secure-ops.session')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifySessionToken(token)
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Sesión inválida o expirada' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('expired', '1')
    return NextResponse.redirect(loginUrl)
  }

  // ── Inyectar datos del operador en headers ─────────────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-operator-id', session.sub)
  requestHeaders.set('x-operator-email', session.email)
  requestHeaders.set('x-operator-nombre', session.nombre)
  requestHeaders.set('x-session-jti', session.jti)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // ── Marcar para audit logging cross-tenant ─────────────
  if (CROSS_TENANT_PATHS.some(p => pathname.startsWith(p))) {
    response.headers.set('x-ops-audit', '1')
    response.headers.set('x-ops-audit-path', pathname)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
