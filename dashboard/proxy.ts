// ============================================================
// Proxy de Seguridad (Next.js 16.2+)
// ============================================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
// Todos centralizados AQUÍ (proxy corre después de next.config.js).
// next.config.js solo mantiene headers para caching del SW y CSP report.
const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // camera/microphone permitidos para videollamadas con LiveKit
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
  'X-DNS-Prefetch-Control': 'on',
  // Cross-Origin isolation (previene side-channel attacks)
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// ─── Helper: verificar si hay sesión activa via cookie ───
// NextAuth v5 usa `authjs.session-token` (HTTP) o `__Secure-authjs.session-token` (HTTPS)
// Admite también cookie de impersonación (__Secure-impersonation.session)
function hasSessionCookie(request: NextRequest): boolean {
  const nextAuthCookie =
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

  if (!!request.cookies.get(nextAuthCookie)) return true;

  const impCookie =
    process.env.NODE_ENV === 'production'
      ? '__Secure-impersonation.session'
      : 'impersonation.session';

  return !!request.cookies.get(impCookie);
}

// ─── Helper: detectar tenant por subdominio ─────────────
function detectTenant(hostname: string): string {
  // localhost, 127.0.0.1, o IP → tenant por defecto
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
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

// ─── Proxy principal ──────────────────────────────────────
/**
 *
 * @param request
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 1. Detectar tenant, requestId y pasar a la request ──
  const hostname = request.headers.get('host') || 'localhost';
  const requestId = generateRequestId();
  const requestHeaders = new Headers(request.headers);

  // ─── 1b. Dominios dedicados al portal del paciente ──────
  // Ej: consultorio.aicorebots.com debe mostrar el Portal del Paciente (/portal),
  // no la landing de marketing ni el login del dashboard.
  const PORTAL_DOMAINS = new Set(
    (process.env.PORTAL_DOMAINS || 'consultorio.aicorebots.com')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  );

  const isPortalDomain = PORTAL_DOMAINS.has(hostname.toLowerCase());
  // El subdominio del dominio portal (ej: 'consultorio') no es un tenant real:
  // resolver siempre al tenant por defecto para mantener branding/config consistentes.
  let tenantId = isPortalDomain ? '00000000-0000-0000-0000-000000000000' : detectTenant(hostname);

  // ─── 1c. Override de tenant por sesión de impersonación ──
  // Si hay cookie de impersonación válida, el tenant es el impersonado
  // (el operador entra desde el dominio raíz, sin subdominio del tenant).
  const impCookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-impersonation.session'
      : 'impersonation.session';
  const impCookie = request.cookies.get(impCookieName);
  if (impCookie?.value) {
    try {
      const { jwtVerify } = await import('jose');
      const { payload } = await jwtVerify(
        impCookie.value,
        new TextEncoder().encode(process.env.AUTH_SECRET || ''),
        { algorithms: ['HS256'] },
      );
      const data = payload as { impersonating?: boolean; tenantId?: string };
      if (data.impersonating && data.tenantId) {
        tenantId = data.tenantId;
      }
    } catch {
      // Cookie inválida → ignorar override
    }
  }

  requestHeaders.set('x-tenant-id', tenantId);
  requestHeaders.set('x-request-id', requestId);

  if (isPortalDomain) {
    const isPortalPath =
      pathname === '/portal' || pathname.startsWith('/portal/') || pathname.startsWith('/api/');
    if (!isPortalPath) {
      const portalUrl = new URL('/portal', request.url);
      portalUrl.search = request.nextUrl.search;
      return NextResponse.redirect(portalUrl, 308);
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-request-id', requestId);

  // Copiar security headers al nuevo response
  // Excluir videollamada de COEP/COOP/CRP porque LiveKit es cross-origin
  const isVideoRoute = pathname.startsWith('/videollamada');
  if (isVideoRoute) {
    const relaxedHeaders = { ...securityHeaders };
    delete relaxedHeaders['Cross-Origin-Embedder-Policy'];
    delete relaxedHeaders['Cross-Origin-Opener-Policy'];
    delete relaxedHeaders['Cross-Origin-Resource-Policy'];
    Object.entries(relaxedHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } else {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Strict-Transport-Security solo en producción
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }

  // Content-Security-Policy (CSP)
  // Centralizado aquí con next.config.js como fallback
  const cspBase =
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss://livekit.aicorebots.com https://livekit.aicorebots.com https://api.mercadopago.com https://api.twilio.com https://api.whatsapp.com https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; report-uri /api/csp-report";
  const csp =
    process.env.NODE_ENV === 'development'
      ? cspBase.replace(
          "script-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        )
      : cspBase;
  response.headers.set('Content-Security-Policy', csp);

  // ─── 2. Rate limiting específico por ruta ──────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  function rateLimitedResponse(limitSecs: number): NextResponse {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Retry-After': String(limitSecs),
    });
    Object.entries(securityHeaders).forEach(([k, v]) => headers.set(k, v));
    return new NextResponse(JSON.stringify({ error: 'Demasiados intentos. Esperá un momento.' }), {
      status: 429,
      headers,
    });
  }

  if (request.method === 'POST') {
    // Registro: 3 intentos por minuto
    if (pathname === '/api/auth/register') {
      if (!rateLimit(`register:${ip}`, 3, 60_000)) return rateLimitedResponse(60);
    }
    // Recuperación de contraseña: 3 intentos por minuto
    else if (pathname === '/api/auth/forgot-password') {
      if (!rateLimit(`forgot:${ip}`, 3, 60_000)) return rateLimitedResponse(60);
    }
    // Reset de contraseña: 5 intentos por minuto
    else if (pathname === '/api/auth/reset-password') {
      if (!rateLimit(`resetpw:${ip}`, 5, 60_000)) return rateLimitedResponse(60);
    }
    // Login (NextAuth v5 POSTea a /api/auth/callback/credentials): 5 intentos por minuto
    else if (pathname.startsWith('/api/auth/')) {
      if (!rateLimit(`login:${ip}`, 5, 60_000)) return rateLimitedResponse(60);
    }
    // Portal auth: 3 solicitudes de magic link por minuto
    else if (pathname === '/api/portal/auth/request') {
      if (!rateLimit(`portal-auth:${ip}`, 3, 60_000)) return rateLimitedResponse(60);
    }
  }

  // Rate limit general para APIs (120 requests por minuto por IP)
  // Un dashboard hace ~7 llamadas al cargar + polling cada 60s
  // Excluir /api/auth/ (ya tiene rate limit específico), /api/v1/ (API key propio)
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    !pathname.startsWith('/api/v1/')
  ) {
    if (!rateLimit(`api:${ip}`, 120, 60_000)) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Retry-After': '60',
      });
      Object.entries(securityHeaders).forEach(([k, v]) => headers.set(k, v));
      return new NextResponse(
        JSON.stringify({ error: 'Demasiadas requests. Esperá un momento.' }),
        { status: 429, headers },
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
  const PORTAL_AUTH_ROUTES = [
    '/portal/dashboard',
    '/portal/agendar',
    '/portal/turnos',
    '/portal/recetas',
    '/portal/historial',
    '/portal/perfil',
  ];
  if (PORTAL_AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
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
    // Aplicar proxy a todas las rutas excepto archivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
