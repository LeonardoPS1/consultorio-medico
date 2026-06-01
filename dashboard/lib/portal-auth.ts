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
import { pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// ─── Config ──────────────────────────────────────────────────

const PORTAL_TOKEN_EXPIRY_MINUTES = 10; // Magic link expira en 10 min
const PORTAL_SESSION_HOURS = 24; // La sesión dura 24 horas
const SESSION_COOKIE_NAME = 'portal_session';
const AUTH_SECRET = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET no configurado');
  return new TextEncoder().encode(secret);
};

// ─── Tipos ───────────────────────────────────────────────────

export interface PortalSession {
  pacienteId: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

// ─── Generar Magic Link Token ────────────────────────────────

export interface GenerateTokenResult {
  token: string;
  magicLink: string;
}

/**
 * Genera un token de magic link y lo almacena en la DB.
 * Devuelve el token y la URL completa del magic link.
 */
export async function generateMagicLink(telefono: string): Promise<GenerateTokenResult | null> {
  // 1. Buscar paciente
  const [paciente] = await db
    .select({ id: pacientes.id, nombre: pacientes.nombre })
    .from(pacientes)
    .where(eq(pacientes.telefono, telefono))
    .limit(1);

  if (!paciente) return null;

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

  // 4. Construir magic link
  const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
  const magicLink = `${baseUrl}/portal/verify?token=${token}`;

  return { token, magicLink };
}

// ─── Verificar Magic Link Token ──────────────────────────────

/**
 * Verifica un token de magic link y devuelve el paciente si es válido.
 * Invalida el token después de usarlo (one-time use).
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
    .where(
      and(
        eq(pacientes.portalToken, token),
        sql`${pacientes.portalTokenExpires} > NOW()`,
      ),
    )
    .limit(1);

  if (!paciente) return null;

  // One-time use: invalidar token
  await db
    .update(pacientes)
    .set({ portalToken: null, portalTokenExpires: null })
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
    safeError('[PortalAuth] Error enviando magic link:', e instanceof Error ? { message: e.message } : e);
    return false;
  }
}
