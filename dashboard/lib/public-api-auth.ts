/**
 * Public API Authentication
 *
 * Maneja la generación, validación y gestión de API keys
 * para integraciones externas vía /api/v1/.
 *
 * Formato de key: amk_{random_bytes_hex}
 * Ejemplo: amk_8a3f9b2c1d0e4f5a6b7c8d9e
 */

import { db } from '@/lib/db';
import { apiKeys } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { API_SCOPES, type ApiScope, type ApiKeyData, type ApiKeyValidation } from './public-api-types';

// Re-export para que los endpoints puedan importar de un solo lugar
export { API_SCOPES, type ApiScope, type ApiKeyData, type ApiKeyValidation };

// ─── Constantes ──────────────────────────────────────────────

const KEY_PREFIX = 'amk_';
const KEY_PREFIX_LENGTH = 8;
const KEY_BYTES = 24;

// ─── Generar API Key ─────────────────────────────────────────

export interface GeneratedApiKey {
  /** La key completa (solo se muestra una vez) */
  fullKey: string;
  /** Hash de la key (para almacenar) */
  keyHash: string;
  /** Prefijo de la key (para identificar) */
  keyPrefix: string;
}

/**
 * Genera una nueva API key.
 * La key completa solo se devuelve UNA vez al crearla.
 */
export function generateApiKey(): GeneratedApiKey {
  const randomBytes = crypto.randomBytes(KEY_BYTES);
  const hexPart = randomBytes.toString('hex');
  const fullKey = `${KEY_PREFIX}${hexPart}`;
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  const keyPrefix = fullKey.slice(0, KEY_PREFIX_LENGTH);

  return { fullKey, keyHash, keyPrefix };
}

// ─── Hash de key (para verificación) ─────────────────────────

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ─── Extraer key del header ──────────────────────────────────

/**
 * Extrae la API key del header Authorization o x-api-key.
 * Acepta:
 *   - Authorization: Bearer amk_xxx
 *   - x-api-key: amk_xxx
 */
export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader.trim();
  }

  return null;
}

// ─── Validar API Key ─────────────────────────────────────────

/**
 * Valida una API key contra la DB.
 * Verifica: existe el hash, está activa, no expiró.
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  if (!key || !key.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Formato de API key inválido' };
  }

  const keyHash = hashKey(key);

  try {
    const result = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          eq(apiKeys.activa, true),
          sql`(${apiKeys.expiresAt} IS NULL OR ${apiKeys.expiresAt} > NOW())`,
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return { valid: false, error: 'API key inválida o expirada' };
    }

    const keyRecord = result[0];

    // Actualizar último uso (fire-and-forget)
    db.update(apiKeys)
      .set({ ultimoUso: sql`NOW()` })
      .where(eq(apiKeys.id, keyRecord.id))
      .catch(() => {});

    return {
      valid: true,
      data: {
        id: keyRecord.id,
        tenantId: keyRecord.tenantId,
        nombre: keyRecord.nombre,
        scopes: keyRecord.scopes || [],
        activa: keyRecord.activa,
        expiresAt: keyRecord.expiresAt,
      },
    };
  } catch (e) {
    console.error('[PublicAPI] Error validando key:', e);
    return { valid: false, error: 'Error interno de validación' };
  }
}

// ─── Verificar scope ─────────────────────────────────────────

/**
 * Verifica si una API key tiene un scope específico.
 */
export function hasScope(apiKeyData: ApiKeyData, requiredScope: ApiScope): boolean {
  return apiKeyData.scopes.includes(requiredScope) || apiKeyData.scopes.includes('*');
}

// ─── Crear API key en DB ─────────────────────────────────────

export interface CreateApiKeyInput {
  nombre: string;
  scopes: string[];
  createdBy: string;
  expiresAt?: Date;
  tenantId?: string;
}

export interface CreateApiKeyResult {
  keyData: GeneratedApiKey;
  id: string;
}

/**
 * Crea una nueva API key en la DB.
 * Devuelve la key completa (única vez).
 */
export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const generated = generateApiKey();

  const [result] = await db
    .insert(apiKeys)
    .values({
      tenantId: input.tenantId || '00000000-0000-0000-0000-000000000000',
      nombre: input.nombre,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      scopes: input.scopes,
      activa: true,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt || null,
    })
    .returning({ id: apiKeys.id });

  return { keyData: generated, id: result.id };
}

// ─── Listar API keys (sin key_hash) ──────────────────────────

export interface ApiKeyListItem {
  id: string;
  nombre: string;
  keyPrefix: string;
  scopes: string[];
  activa: boolean;
  ultimoUso: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Lista las API keys de un tenant.
 * NUNCA devuelve el key_hash (solo el key_prefix).
 */
export async function listApiKeys(tenantId: string): Promise<ApiKeyListItem[]> {
  const result = await db
    .select({
      id: apiKeys.id,
      nombre: apiKeys.nombre,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      activa: apiKeys.activa,
      ultimoUso: apiKeys.ultimoUso,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId))
    .orderBy(sql`${apiKeys.createdAt} DESC`);

  return result.map((r) => ({ ...r, scopes: r.scopes || [] }));
}

// ─── Revocar API key ─────────────────────────────────────────

export async function revokeApiKey(keyId: string): Promise<void> {
  await db.update(apiKeys).set({ activa: false }).where(eq(apiKeys.id, keyId));
}
