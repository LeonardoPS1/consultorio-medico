// ============================================================
// Middleware de Seguridad
// ============================================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Rate Limiter en memoria ─────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, maxAttempts: number = 10, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

// Limpiar entradas viejas cada 5 minutos (compatible con TS < es2015)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    });
  }, 5 * 60_000);
}

// ─── Headers de seguridad ──────────────────────────────────
const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'off',
};

// ─── Helper: verificar si hay sesión activa via cookie ───
// NextAuth v5 usa `authjs.session-token` (HTTP) o `__Secure-authjs.session-token` (HTTPS)
function hasSessionCookie(request: NextRequest): boolean {
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

  return !!request.cookies.get(cookieName);
}

// ─── Middleware principal ──────────────────────────────────
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // ─── 1. Headers de seguridad en TODAS las respuestas ──
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Strict-Transport-Security solo en producción
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // ─── 2. Rate limiting global por IP ────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';

  // Rate limit para login (autenticación). NextAuth v5 POSTea a /api/auth/callback/credentials
  if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
    if (!rateLimit(`login:${ip}`, 5, 60_000)) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Retry-After': '60',
      });
      Object.entries(securityHeaders).forEach(([k, v]) => headers.set(k, v));
      return new NextResponse(
        JSON.stringify({ error: 'Demasiados intentos. Esperá 1 minuto.' }),
        { status: 429, headers }
      );
    }
  }

  // Rate limit general para APIs (30 requests por minuto por IP)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!rateLimit(`api:${ip}`, 30, 60_000)) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Retry-After': '60',
      });
      Object.entries(securityHeaders).forEach(([k, v]) => headers.set(k, v));
      return new NextResponse(
        JSON.stringify({ error: 'Demasiadas requests. Esperá un momento.' }),
        { status: 429, headers }
      );
    }
  }

  // ─── 3. Proteger rutas del dashboard ──────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ─── 4. Si ya tiene sesión y va al login, redirigir ──
  if (pathname === '/login' && request.method === 'GET' && hasSessionCookie(request)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Aplicar middleware a todas las rutas excepto archivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
