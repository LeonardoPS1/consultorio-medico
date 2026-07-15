/**
 * Portal Auth — Autenticación de pacientes
 *
 * Flujo:
 * 1. Paciente ingresa teléfono en /portal
 * 2. Sistema genera token, lo almacena en pacientes.portal_token,
 *    envía magic link por WhatsApp.
 * 3. Paciente clickea link → /portal/verify?token=xxx
 * 4. Token validado, se genera JWT de sesión (24h), se setea cookie.
 * 5. Páginas protegidas leen cookie → JWT → paciente autenticado.
 */

import { db } from '@/lib/db';
import { safeWarn, safeError } from '@/lib/logger';
import { pacientes, blacklist, rateLimits, usuarios, sucursales, turnos, medicos } from '@/drizzle/schema';
import { eq, and, sql, lte, gte } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { canAccess, type FeatureId } from './features';

// ─── Config ──────────────────────────────────────────────────

const PORTAL_TOKEN_EXPIRY_MINUTES = 10;
const PORTAL_SESSION_HOURS = 24;
const SESSION_COOKIE_NAME = 'portal_session';
const RATE_LIMIT_MAX = 3; // intentos de magic link
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_CANCELACIONES = 3; // cancelaciones permitidas por mes
const AUTH_SECRET = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no configurado');
  return new TextEncoder().encode(secret);
};

// ─── Rate limiting en DB (por teléfono) ─────────────────────
export async function checkPhoneRateDB(
  telefono: string,
  maxRequests = RATE_LIMIT_MAX,
  windowMs = RATE_LIMIT_WINDOW_MS,
): Promise<boolean> {
  const key = `portal-magic-link:${telefono}`;
  const now = new Date();

  const [existing] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!existing || now >= existing.resetAt) {
    await db
      .insert(rateLimits)
      .values({
        key,
        count: 1,
        maxRequests,
        windowMs,
        resetAt: new Date(now.getTime() + windowMs),
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: 1,
          maxRequests,
          windowMs,
          resetAt: new Date(now.getTime() + windowMs),
          updatedAt: now,
        },
      });
    return true;
  }

  if (existing.count >= existing.maxRequests) return false;

  await db
    .update(rateLimits)
    .set({ count: existing.count + 1, updatedAt: now })
    .where(eq(rateLimits.id, existing.id));

  return true;
}

// ─── Blacklist check ─────────────────────────────────────────

export async function checkBlacklist(
  pacienteId: string,
): Promise<{ bloqueado: boolean; motivo?: string }> {
  const [entry] = await db
    .select({ motivo: blacklist.motivo, bloqueadoHasta: blacklist.bloqueadoHasta })
    .from(blacklist)
    .where(
      and(
        eq(blacklist.pacienteId, pacienteId),
        eq(blacklist.activo, true),
        sql`(${blacklist.bloqueadoHasta} IS NULL OR ${blacklist.bloqueadoHasta} > NOW())`,
      ),
    )
    .limit(1);

  if (entry) {
    return {
      bloqueado: true,
      motivo: entry.motivo || 'Paciente bloqueado',
    };
  }
  return { bloqueado: false };
}

// ─── Cancelaciones del mes ──────────────────────────────────

export async function contarCancelacionesMes(pacienteId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        eq(turnos.estado, 'cancelada'),
        gte(turnos.updatedAt, startOfMonth),
      ),
    );

  return result?.count ?? 0;
}

// ─── Tipos ───────────────────────────────────────────────────

export interface PortalSession {
  pacienteId: string;
  nombre: string;
  apellido: string;
  telefono: string;
  esPrueba?: boolean;
}

// ─── Generar Magic Link Token ────────────────────────────────

export interface GenerateTokenResult {
  token: string;
  magicLink: string;
}

/**
 * Genera un token de magic link y lo almacena en la DB.
 * Incluye rate limiting por teléfono y verificación de blacklist.
 * Devuelve el token y la URL completa del magic link.
 */
export async function generateMagicLink(
  telefono: string,
  redirect?: string,
): Promise<GenerateTokenResult | null> {
  // 0. Rate limiting por teléfono (DB-backed)
  if (!(await checkPhoneRateDB(telefono))) {
    safeWarn(`[PortalAuth] Rate limit excedido para ${telefono}`);
    return null;
  }

  // 1. Buscar paciente
  const [paciente] = await db
    .select({ id: pacientes.id, nombre: pacientes.nombre })
    .from(pacientes)
    .where(eq(pacientes.telefono, telefono))
    .limit(1);

  if (!paciente) return null;

  // 1b. Verificar blacklist
  const bl = await checkBlacklist(paciente.id);
  if (bl.bloqueado) {
    safeWarn(`[PortalAuth] Paciente bloqueado intenta acceso: ${paciente.id} — ${bl.motivo}`);
    return null;
  }

  // 2. Generar token criptográfico
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PORTAL_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // 3. Almacenar
  await db
    .update(pacientes)
    .set({
      portalToken: token,
      portalTokenExpires: expiresAt,
    })
    .where(eq(pacientes.id, paciente.id));

  // 4. Construir magic link (con redirect opcional)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
  let magicLink = `${baseUrl}/portal/verify?token=${token}`;
  if (redirect) {
    // Solo permitir URLs relativas del portal (seguridad anti-open-redirect)
    const cleanRedirect = redirect.startsWith('/portal/') ? redirect : null;
    if (cleanRedirect) {
      magicLink += `&redirect=${encodeURIComponent(cleanRedirect)}`;
    }
  }

  return { token, magicLink };
}

// ─── Verificar Magic Link Token ──────────────────────────────

/**
 * Verifica un token de magic link y devuelve el paciente si es válido.
 * Invalida el token después de usarlo (one-time use).
 * Actualiza ultimoAccesoPortal al iniciar sesión.
 */
export async function verifyMagicToken(token: string): Promise<PortalSession | null> {
  const [paciente] = await db
    .select({
      id: pacientes.id,
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
      telefono: pacientes.telefono,
    })
    .from(pacientes)
    .where(and(eq(pacientes.portalToken, token), sql`${pacientes.portalTokenExpires} > NOW()`))
    .limit(1);

  if (!paciente) return null;

  // One-time use: invalidar token + actualizar último acceso
  await db
    .update(pacientes)
    .set({
      portalToken: null,
      portalTokenExpires: null,
      ultimoAccesoPortal: sql`NOW()`,
    })
    .where(eq(pacientes.id, paciente.id));

  return {
    pacienteId: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    telefono: paciente.telefono,
  };
}

// ─── JWT Sesión ──────────────────────────────────────────────

/**
 * Genera un JWT de sesión para el portal del paciente.
 * Válido por 24 horas.
 */
export async function generateSessionToken(session: PortalSession): Promise<string> {
  const secret = AUTH_SECRET();
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_SESSION_HOURS}h`)
    .sign(secret);

  return token;
}

/**
 * Verifica un JWT de sesión del portal y devuelve los datos.
 */
export async function verifySessionToken(token: string): Promise<PortalSession | null> {
  try {
    const secret = AUTH_SECRET();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as PortalSession;
  } catch {
    return null;
  }
}

// ─── Cookie management ───────────────────────────────────────

/**
 * Setea la cookie de sesión del portal (httpOnly, secure en prod).
 */
export async function setPortalSessionCookie(session: PortalSession): Promise<string> {
  const token = await generateSessionToken(session);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PORTAL_SESSION_HOURS * 3600,
  });

  return token;
}

/**
 * Lee y verifica la cookie de sesión del portal.
 * Devuelve la sesión o null si no es válida.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;

    return await verifySessionToken(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Elimina la cookie de sesión del portal (logout).
 */
export async function clearPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ─── Enviar Magic Link por WhatsApp ──────────────────────────

/**
 * Envía el magic link por WhatsApp usando Twilio.
 * Fire-and-forget: no bloquea la respuesta.
 */
export async function sendPortalMagicLinkWhatsApp(
  telefono: string,
  pacienteNombre: string,
  magicLink: string,
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    safeWarn('[PortalAuth] Twilio no configurado, no se puede enviar magic link');
    return false;
  }

  const message = `🔐 *Portal del Paciente - Consultorio Médico*

Hola ${pacienteNombre}, tu acceso seguro está listo:

👉 ${magicLink}

Este enlace expira en ${PORTAL_TOKEN_EXPIRY_MINUTES} minutos y solo funciona una vez.
No compartas este mensaje.`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: telefono.startsWith('+') ? telefono : `+${telefono}`,
          From: fromNumber,
          Body: message,
        }),
      },
    );

    return response.ok;
  } catch (e) {
    safeError(
      '[PortalAuth] Error enviando magic link:',
      e instanceof Error ? { message: e.message } : e,
    );
    return false;
  }
}

// ─── CSRF Protection ─────────────────────────────────────────

/**
 * Valida el header Origin contra el host del servidor.
 * Previene CSRF en rutas POST/PATCH del portal.
 */
export function validateCSRFOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  // Sin origin → misma-origen GET/HEAD o server-side
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

// ─── Feature Gate — Portal del Paciente ───────────────────────

/**
 * Verifica si el tenant del paciente tiene acceso al portal
 * según el plan del usuario asociado.
 *
 * 1. Paciente → sucursal → tenantId
 * 2. Busca el primer usuario activo de ese tenant
 * 3. Verifica canAccess(plan, 'portal-paciente')
 */
export async function checkPortalFeatureAccess(
  pacienteId: string,
): Promise<{ allowed: boolean; plan?: string }> {
  try {
    // 1. Obtener sucursalId del paciente
    const [paciente] = await db
      .select({ sucursalId: pacientes.sucursalId })
      .from(pacientes)
      .where(eq(pacientes.id, pacienteId))
      .limit(1);

    if (!paciente) {
      safeWarn(`[PortalAuth] Paciente no encontrado: ${pacienteId}`);
      return { allowed: false };
    }

    let plan: string | null = null;

    // 2a. Intentar via sucursalId → tenant → usuario
    if (paciente.sucursalId) {
      const [result] = await db
        .select({ plan: usuarios.plan })
        .from(sucursales)
        .innerJoin(usuarios, eq(usuarios.tenantId, sucursales.tenantId))
        .where(and(eq(sucursales.id, paciente.sucursalId), eq(usuarios.activo, true)))
        .limit(1);

      if (result) plan = result.plan;
    }

    // 2b. Fallback: via turnos → médico → usuario
    if (!plan) {
      const [result] = await db
        .select({ plan: usuarios.plan })
        .from(turnos)
        .innerJoin(medicos, eq(turnos.medicoId, medicos.id))
        .innerJoin(usuarios, eq(usuarios.id, medicos.usuarioId))
        .where(and(eq(turnos.pacienteId, pacienteId), eq(usuarios.activo, true)))
        .orderBy(sql`${turnos.createdAt} DESC`)
        .limit(1);

      if (result) plan = result.plan;
    }

    if (!plan) {
      safeWarn(`[PortalAuth] No se encontró plan para paciente ${pacienteId}`);
      return { allowed: false };
    }

    const allowed = canAccess(plan, 'portal-paciente' as FeatureId);
    return { allowed, plan };
  } catch (e) {
    safeError(
      '[PortalAuth] Error verificando acceso portal:',
      e instanceof Error ? { message: e.message } : e,
    );
    return { allowed: false };
  }
}
