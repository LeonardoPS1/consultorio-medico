/**
 * Credential Store — Capa de almacenamiento de credenciales.
 *
 * Similar a data-store.ts pero específico para credenciales:
 * - PostgreSQL (producción) vía Drizzle
 * - JSON fallback (desarrollo) con persistencia local
 *
 * Los valores se guardan ENCRIPTADOS (AES-256-GCM).
 */

import fs from 'fs';
import path from 'path';
import { encrypt, decrypt, maskValue } from '@/lib/encryption';

/** Helper para extraer rows de un resultado SQL (Drizzle + postgres-js) */
function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows;
  }
  return result as T[];
}

// ============================================================
// Tipos
// ============================================================

export interface CredencialData {
  id: string;
  servicio: string;
  clave: string;
  valor: string; // Siempre encriptado en DB, pero acá manejamos raw
  encriptado: boolean;
  etiqueta?: string;
  n8nCredentialId?: string;
  n8nCredentialType?: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredencialInput {
  servicio: string;
  clave: string;
  valor: string; // Valor en texto plano (se encripta al guardar)
  etiqueta?: string;
  n8nCredentialId?: string;
  n8nCredentialType?: string;
  orden?: number;
}

export interface ServicioCredenciales {
  servicio: string;
  displayName: string;
  descripcion: string;
  icon: string;
  campos: Array<{
    clave: string;
    etiqueta: string;
    tipo: 'text' | 'password' | 'number' | 'boolean';
    requerido: boolean;
    placeholder?: string;
  }>;
  n8nSync: boolean;
  n8nCredentialId?: string;
  n8nCredentialType?: string;
  testable: boolean;
}

// ============================================================
// Definición de servicios soportados
// ============================================================

export const SERVICIOS_CONFIG: ServicioCredenciales[] = [
  {
    servicio: 'twilio',
    displayName: 'Twilio (WhatsApp)',
    descripcion: 'Credenciales para enviar y recibir mensajes de WhatsApp',
    icon: 'twilio',
    campos: [
      {
        clave: 'account_sid',
        etiqueta: 'Account SID',
        tipo: 'text',
        requerido: true,
        placeholder: 'AC...',
      },
      { clave: 'auth_token', etiqueta: 'Auth Token', tipo: 'password', requerido: true },
      {
        clave: 'whatsapp_number',
        etiqueta: 'Número de WhatsApp',
        tipo: 'text',
        requerido: true,
        placeholder: 'whatsapp:+14155238886',
      },
    ],
    n8nSync: true,
    n8nCredentialType: 'twilioApi',
    testable: false,
  },
  {
    servicio: 'ollama',
    displayName: 'Ollama (IA Local)',
    descripcion: 'Servidor de IA local con Mistral',
    icon: 'bot',
    campos: [
      {
        clave: 'base_url',
        etiqueta: 'Base URL',
        tipo: 'text',
        requerido: true,
        placeholder: 'http://ollama:11434',
      },
      {
        clave: 'modelo',
        etiqueta: 'Modelo',
        tipo: 'text',
        requerido: false,
        placeholder: 'mistral',
      },
    ],
    n8nSync: true,
    n8nCredentialType: 'ollamaApi',
    testable: true,
  },
  {
    servicio: 'n8n',
    displayName: 'n8n (Automatización)',
    descripcion: 'Conexión con el servidor de n8n para sincronizar credenciales',
    icon: 'globe',
    campos: [
      {
        clave: 'base_url',
        etiqueta: 'URL Base',
        tipo: 'text',
        requerido: true,
        placeholder: 'https://n8n.aicorebots.com',
      },
      { clave: 'api_key', etiqueta: 'API Key', tipo: 'password', requerido: true },
    ],
    n8nSync: false,
    testable: true,
  },
  {
    servicio: 'smtp',
    displayName: 'SMTP (Correo Saliente)',
    descripcion: 'Servidor de correo para enviar emails',
    icon: 'mail',
    campos: [
      {
        clave: 'host',
        etiqueta: 'Host',
        tipo: 'text',
        requerido: true,
        placeholder: 'smtp.gmail.com',
      },
      { clave: 'port', etiqueta: 'Puerto', tipo: 'number', requerido: true, placeholder: '587' },
      { clave: 'user', etiqueta: 'Usuario', tipo: 'text', requerido: true },
      { clave: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true },
      { clave: 'ssl', etiqueta: 'Usar SSL', tipo: 'boolean', requerido: false },
    ],
    n8nSync: true,
    n8nCredentialType: 'smtp',
    testable: false,
  },
  {
    servicio: 'imap',
    displayName: 'IMAP (Correo Entrante)',
    descripcion: 'Servidor de correo para leer emails entrantes',
    icon: 'mail',
    campos: [
      {
        clave: 'host',
        etiqueta: 'Host',
        tipo: 'text',
        requerido: true,
        placeholder: 'imap.gmail.com',
      },
      { clave: 'port', etiqueta: 'Puerto', tipo: 'number', requerido: true, placeholder: '993' },
      { clave: 'user', etiqueta: 'Usuario', tipo: 'text', requerido: true },
      { clave: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true },
      { clave: 'ssl', etiqueta: 'Usar SSL', tipo: 'boolean', requerido: false },
    ],
    n8nSync: true,
    n8nCredentialType: 'imap',
    testable: false,
  },
  {
    servicio: 'postgres',
    displayName: 'PostgreSQL (Base de Datos)',
    descripcion: 'Conexión a la base de datos principal',
    icon: 'database',
    campos: [
      { clave: 'host', etiqueta: 'Host', tipo: 'text', requerido: true, placeholder: 'localhost' },
      { clave: 'port', etiqueta: 'Puerto', tipo: 'number', requerido: true, placeholder: '5432' },
      {
        clave: 'database',
        etiqueta: 'Base de Datos',
        tipo: 'text',
        requerido: true,
        placeholder: 'consultorio_medico',
      },
      {
        clave: 'user',
        etiqueta: 'Usuario',
        tipo: 'text',
        requerido: true,
        placeholder: 'postgres',
      },
      { clave: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true },
    ],
    n8nSync: true,
    n8nCredentialType: 'postgres',
    testable: false,
  },
  {
    servicio: 'google_calendar',
    displayName: 'Google Calendar',
    descripcion: 'Sincronización de turnos con Google Calendar',
    icon: 'calendar',
    campos: [
      { clave: 'email', etiqueta: 'Service Account Email', tipo: 'text', requerido: true },
      { clave: 'private_key', etiqueta: 'Private Key', tipo: 'password', requerido: true },
    ],
    n8nSync: true,
    n8nCredentialType: 'googleApi',
    testable: false,
  },
  {
    servicio: 'telefono_doctor',
    displayName: 'Teléfono del Médico',
    descripcion: 'Número de WhatsApp personal para recibir alertas de urgencia',
    icon: 'phone',
    campos: [
      {
        clave: 'whatsapp',
        etiqueta: 'WhatsApp',
        tipo: 'text',
        requerido: true,
        placeholder: '+56955550000',
      },
      {
        clave: 'email',
        etiqueta: 'Email',
        tipo: 'text',
        requerido: false,
        placeholder: 'medico@consultorio.com',
      },
    ],
    n8nSync: false,
    testable: false,
  },
];

// ============================================================
// Store JSON (fallback para desarrollo local)
// ============================================================

const DATA_DIR = path.join(process.cwd(), '.data');
const CREDENCIALES_FILE = path.join(DATA_DIR, 'credenciales.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(): CredencialData[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(CREDENCIALES_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(CREDENCIALES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(data: CredencialData[]): void {
  ensureDataDir();
  fs.writeFileSync(CREDENCIALES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// Store principal
// ============================================================

let pgAvailable: boolean | null = null;

async function checkPostgres(): Promise<boolean> {
  if (pgAvailable !== null) return pgAvailable;
  try {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1`);
    pgAvailable = true;
    return true;
  } catch {
    pgAvailable = false;
    return false;
  }
}

/**
 * Obtiene todas las credenciales (con valores desencriptados).
 */
export async function getAllCredenciales(): Promise<CredencialData[]> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT id, servicio, clave, valor, encriptado, etiqueta,
             n8n_credential_id, n8n_credential_type, orden,
             created_at, updated_at
      FROM credenciales
      ORDER BY orden, servicio, clave
    `);
    const rows = extractRows<Record<string, unknown>>(result);
    return rows.map((r) => {
      const raw = r as Record<string, unknown>;
      return {
        id: raw.id as string,
        servicio: raw.servicio as string,
        clave: raw.clave as string,
        valor: raw.encriptado ? decrypt(raw.valor as string) : String(raw.valor ?? ''),
        encriptado: raw.encriptado as boolean,
        etiqueta: (raw.etiqueta as string) || undefined,
        n8nCredentialId: (raw.n8n_credential_id as string) || undefined,
        n8nCredentialType: (raw.n8n_credential_type as string) || undefined,
        orden: raw.orden as number,
        createdAt:
          typeof raw.created_at === 'object'
            ? (raw.created_at as Date).toISOString()
            : String(raw.created_at ?? ''),
        updatedAt:
          typeof raw.updated_at === 'object'
            ? (raw.updated_at as Date).toISOString()
            : String(raw.updated_at ?? ''),
      };
    });
  }

  // Fallback JSON
  return readJSON().map((c) => ({
    ...c,
    valor: c.encriptado ? decrypt(c.valor) : c.valor,
  }));
}

/**
 * Obtiene todas las credenciales con valores enmascarados (para usuarios no admin).
 */
export async function getAllCredencialesMasked(): Promise<CredencialData[]> {
  const creds = await getAllCredenciales();
  return creds.map((c) => ({
    ...c,
    valor: maskValue(c.valor),
  }));
}

/**
 * Obtiene las credenciales agrupadas por servicio.
 */
export async function getCredencialesByServicio(servicio: string): Promise<Record<string, string>> {
  const all = await getAllCredenciales();
  const filtered = all.filter((c) => c.servicio === servicio);
  const result: Record<string, string> = {};
  for (const c of filtered) {
    result[c.clave] = c.valor;
  }
  return result;
}

/**
 * Obtiene una credencial específica.
 */
export async function getCredencial(
  servicio: string,
  clave: string,
): Promise<CredencialData | null> {
  const all = await getAllCredenciales();
  return all.find((c) => c.servicio === servicio && c.clave === clave) || null;
}

/**
 * Guarda (crea o actualiza) una credencial.
 * El valor se encripta antes de almacenar.
 */
export async function saveCredencial(input: CredencialInput): Promise<CredencialData> {
  const valorEncriptado = encrypt(input.valor);
  const now = new Date().toISOString();
  const orden = input.orden ?? 100;

  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');

    // Upsert: INSERT ON CONFLICT DO UPDATE
    const result = await db.execute(sql`
      INSERT INTO credenciales (servicio, clave, valor, encriptado, etiqueta, n8n_credential_id, n8n_credential_type, orden)
      VALUES (${input.servicio}, ${input.clave}, ${valorEncriptado}, true, ${input.etiqueta || null}, ${input.n8nCredentialId || null}, ${input.n8nCredentialType || null}, ${orden})
      ON CONFLICT (servicio, clave)
      DO UPDATE SET valor = ${valorEncriptado}, encriptado = true,
                    etiqueta = ${input.etiqueta || null},
                    n8n_credential_id = ${input.n8nCredentialId || null},
                    n8n_credential_type = ${input.n8nCredentialType || null},
                    orden = ${orden},
                    updated_at = NOW()
      RETURNING id, servicio, clave, valor, encriptado, etiqueta,
                n8n_credential_id, n8n_credential_type, orden,
                created_at, updated_at
    `);

    const rows2 = extractRows<Record<string, unknown>>(result);
    const raw = rows2[0] as Record<string, unknown>;
    return {
      id: raw.id as string,
      servicio: raw.servicio as string,
      clave: raw.clave as string,
      valor: input.valor, // Devolvemos el valor original (no encriptado)
      encriptado: true,
      etiqueta: (raw.etiqueta as string) || undefined,
      n8nCredentialId: (raw.n8n_credential_id as string) || undefined,
      n8nCredentialType: (raw.n8n_credential_type as string) || undefined,
      orden: raw.orden as number,
      createdAt:
        typeof raw.created_at === 'object'
          ? (raw.created_at as Date).toISOString()
          : String(raw.created_at ?? ''),
      updatedAt:
        typeof raw.updated_at === 'object'
          ? (raw.updated_at as Date).toISOString()
          : String(raw.updated_at ?? ''),
    };
  }

  // Fallback JSON
  const data = readJSON();
  const existingIdx = data.findIndex(
    (c) => c.servicio === input.servicio && c.clave === input.clave,
  );

  const record: CredencialData = {
    id: existingIdx >= 0 ? data[existingIdx].id : crypto.randomUUID(),
    servicio: input.servicio,
    clave: input.clave,
    valor: valorEncriptado,
    encriptado: true,
    etiqueta: input.etiqueta,
    n8nCredentialId: input.n8nCredentialId,
    n8nCredentialType: input.n8nCredentialType,
    orden,
    createdAt: existingIdx >= 0 ? data[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    data[existingIdx] = record;
  } else {
    data.push(record);
  }

  writeJSON(data);

  return {
    ...record,
    valor: input.valor, // Devolvemos el original
  };
}

/**
 * Guarda todas las credenciales de un servicio de una vez.
 * Y sincroniza con n8n si corresponde.
 */
export async function saveServicioCredenciales(
  servicio: string,
  valores: Record<string, string>,
  n8nCredentialId?: string | null,
): Promise<{ credenciales: CredencialData[]; n8nSyncResult?: unknown }> {
  const config = SERVICIOS_CONFIG.find((s) => s.servicio === servicio);
  const n8nType = config?.n8nCredentialType;

  const saved: CredencialData[] = [];

  for (const [clave, valor] of Object.entries(valores)) {
    const campo = config?.campos.find((c) => c.clave === clave);
    const c = await saveCredencial({
      servicio,
      clave,
      valor,
      etiqueta: campo?.etiqueta || clave,
      n8nCredentialId: n8nCredentialId || undefined,
      n8nCredentialType: n8nType,
    });
    saved.push(c);
  }

  // Sincronizar con n8n si el servicio lo soporta
  let n8nSyncResult = undefined;
  if (config?.n8nSync) {
    const { syncToN8n } = await import('@/lib/n8n-sync');
    n8nSyncResult = await syncToN8n(servicio, valores, n8nCredentialId);

    // Si n8n creó un nuevo ID, lo guardamos
    if (n8nSyncResult.success && n8nSyncResult.n8nId && n8nSyncResult.n8nId !== n8nCredentialId) {
      for (const c of saved) {
        await saveCredencial({
          ...c,
          n8nCredentialId: n8nSyncResult.n8nId,
          n8nCredentialType: n8nType,
        });
      }
    }
  }

  return { credenciales: saved, n8nSyncResult };
}

/**
 * Elimina una credencial.
 */
export async function deleteCredencial(servicio: string, clave: string): Promise<boolean> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`
      DELETE FROM credenciales WHERE servicio = ${servicio} AND clave = ${clave}
    `);
    return true;
  }

  const data = readJSON();
  const idx = data.findIndex((c) => c.servicio === servicio && c.clave === clave);
  if (idx === -1) return false;
  data.splice(idx, 1);
  writeJSON(data);
  return true;
}

/**
 * Elimina todas las credenciales de un servicio.
 */
export async function deleteServicioCredenciales(servicio: string): Promise<boolean> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`DELETE FROM credenciales WHERE servicio = ${servicio}`);
    return true;
  }

  const data = readJSON();
  const filtered = data.filter((c) => c.servicio !== servicio);
  writeJSON(filtered);
  return true;
}
