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

// ─── Helper: detectar tenant por subdominio ─────────────
function detectTenant(hostname: string): string {
  // localhost, 127.0.0.1, o IP → tenant por defecto
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return '00000000-0000-0000-0000-000000000000';
  }

  // Extraer subdominio (ej: demo.aicoremed.com → 'demo')
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Ignorar 'www'
    if (subdomain !== 'www' && subdomain !== 'app') {
      return subdomain;
    }
  }

  // Sin subdominio → tenant por defecto
  return '00000000-0000-0000-0000-000000000000';
}

// ─── Middleware principal ──────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 1. Detectar tenant y pasar a la request ──────────
  const hostname = request.headers.get('host') || 'localhost';
  const tenantId = detectTenant(hostname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copiar security headers al nuevo response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Strict-Transport-Security solo en producción
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains'
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
  // Excluir /api/v1/ — tienen su propio rate limit por API key
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/v1/')) {
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

  // ─── 4. Proteger rutas del portal (rutas autenticadas) ──
  const PORTAL_AUTH_ROUTES = ['/portal/dashboard', '/portal/turnos', '/portal/recetas', '/portal/historial', '/portal/perfil'];
  if (PORTAL_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    if (!request.cookies.get('portal_session')) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  // ─── 5. Si ya tiene sesión y va al login, redirigir ──
  if (pathname === '/login' && request.method === 'GET' && hasSessionCookie(request)) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard';
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Aplicar middleware a todas las rutas excepto archivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
