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

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX_LOGIN = 5
const RATE_LIMIT_MAX_API = 60

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  return ip
}

function checkRateLimit(key: string, max: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: max - 1, resetAt: now + RATE_LIMIT_WINDOW }
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://med.aicorebots.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', CSP_HEADER)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-XSS-Protection', '0')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith('/api/')
  const isLoginRoute = pathname.startsWith('/api/auth/login/') || pathname.startsWith('/api/auth/register/')
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)

  if (isStaticFile || pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  const rateLimitKey = getRateLimitKey(request)

  if (isLoginRoute) {
    const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, RATE_LIMIT_MAX_LOGIN)
    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
      const response = NextResponse.json(
        { success: false, error: `Demasiados intentos. Intenta de nuevo en ${retryAfter} segundos.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
      return addSecurityHeaders(response)
    }
  } else if (isApiRoute) {
    const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, RATE_LIMIT_MAX_API)
    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
      const response = NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
      return addSecurityHeaders(response)
    }
  }

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  const token = request.cookies.get('__Secure-ops.session')?.value
  if (!token) {
    if (isApiRoute) {
      const response = NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
      return addSecurityHeaders(response)
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    return addSecurityHeaders(response)
  }

  const session = await verifySessionToken(token)
  if (!session) {
    if (isApiRoute) {
      const response = NextResponse.json(
        { success: false, error: 'Sesión inválida o expirada' },
        { status: 401 }
      )
      return addSecurityHeaders(response)
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('expired', '1')
    const response = NextResponse.redirect(loginUrl)
    return addSecurityHeaders(response)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-operator-id', session.sub)
  requestHeaders.set('x-operator-email', session.email)
  requestHeaders.set('x-operator-nombre', session.nombre)
  requestHeaders.set('x-session-jti', session.jti)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (CROSS_TENANT_PATHS.some(p => pathname.startsWith(p))) {
    response.headers.set('x-ops-audit', '1')
    response.headers.set('x-ops-audit-path', pathname)
  }

  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
