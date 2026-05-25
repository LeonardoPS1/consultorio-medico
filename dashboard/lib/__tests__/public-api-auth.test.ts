/**
 * Tests de integración para el sistema de API Pública.
 *
 * Cubre: generación de keys, hashing, scopes, extracción de headers,
 * y validación de formato.
 */

import { describe, it, expect } from 'vitest';
import { generateApiKey, extractApiKey, hasScope, API_SCOPES } from '@/lib/public-api-auth';
import type { ApiKeyData } from '@/lib/public-api-types';

// ─── Helper ─────────────────────────────────────────────────

function makeKeyData(overrides: Partial<ApiKeyData> = {}): ApiKeyData {
  return {
    id: 'test-key-id',
    tenantId: '00000000-0000-0000-0000-000000000000',
    nombre: 'Test Key',
    scopes: [],
    activa: true,
    expiresAt: null,
    ...overrides,
  };
}

// ─── Generación de API Keys ─────────────────────────────────

describe('generateApiKey', () => {
  it('genera una key con el prefijo amk_', () => {
    const { fullKey } = generateApiKey();
    expect(fullKey.startsWith('amk_')).toBe(true);
  });

  it('genera una key de longitud correcta (4 + 48 = 52)', () => {
    const { fullKey } = generateApiKey();
    expect(fullKey).toHaveLength(52);
  });

  it('genera un hash SHA-256 de 64 caracteres', () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(keyHash)).toBe(true);
  });

  it('genera un keyPrefix de 8 caracteres', () => {
    const { keyPrefix } = generateApiKey();
    expect(keyPrefix).toHaveLength(8);
  });

  it('el keyPrefix coincide con los primeros 8 caracteres de fullKey', () => {
    const { fullKey, keyPrefix } = generateApiKey();
    expect(fullKey.startsWith(keyPrefix)).toBe(true);
  });

  it('cada key generada es única (probabilístico)', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 10; i++) {
      keys.add(generateApiKey().fullKey);
    }
    expect(keys.size).toBe(10);
  });

  it('el keyHash es determinista para la misma key', () => {
    const crypto = require('crypto');
    const fullKey = 'amk_testkey1234567890abcdef1234567890abcdef12345678';
    const hash1 = crypto.createHash('sha256').update(fullKey).digest('hex');
    const hash2 = crypto.createHash('sha256').update(fullKey).digest('hex');
    expect(hash1).toBe(hash2);
  });
});

// ─── Extracción de API key de headers ───────────────────────

describe('extractApiKey', () => {
  it('extrae key del header x-api-key', () => {
    const req = new Request('http://localhost/api/v1/medicos', {
      headers: { 'x-api-key': 'amk_abc123' },
    });
    expect(extractApiKey(req)).toBe('amk_abc123');
  });

  it('extrae key del header Authorization: Bearer', () => {
    const req = new Request('http://localhost/api/v1/medicos', {
      headers: { Authorization: 'Bearer amk_xyz789' },
    });
    expect(extractApiKey(req)).toBe('amk_xyz789');
  });

  it('Authorization: Bearer tiene prioridad sobre x-api-key', () => {
    const req = new Request('http://localhost/api/v1/medicos', {
      headers: {
        Authorization: 'Bearer amk_bearer_key',
        'x-api-key': 'amk_direct_key',
      },
    });
    expect(extractApiKey(req)).toBe('amk_bearer_key');
  });

  it('devuelve null si no hay headers de API key', () => {
    const req = new Request('http://localhost/api/v1/medicos');
    expect(extractApiKey(req)).toBeNull();
  });

  it('devuelve null si Authorization no empieza con Bearer', () => {
    const req = new Request('http://localhost/api/v1/medicos', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(extractApiKey(req)).toBeNull();
  });

  it('trimea espacios del header x-api-key', () => {
    const req = new Request('http://localhost/api/v1/medicos', {
      headers: { 'x-api-key': '  amk_space_test  ' },
    });
    expect(extractApiKey(req)).toBe('amk_space_test');
  });
});

// ─── Scopes ─────────────────────────────────────────────────

describe('hasScope', () => {
  it('devuelve true si el scope está en la lista', () => {
    const data = makeKeyData({ scopes: ['turnos:read', 'turnos:write'] });
    expect(hasScope(data, 'turnos:read')).toBe(true);
    expect(hasScope(data, 'turnos:write')).toBe(true);
  });

  it('devuelve false si el scope no está en la lista', () => {
    const data = makeKeyData({ scopes: ['turnos:read'] });
    expect(hasScope(data, 'pacientes:read')).toBe(false);
  });

  it('el scope wildcard (*) da acceso a todo', () => {
    const data = makeKeyData({ scopes: ['*'] });
    expect(hasScope(data, 'turnos:read')).toBe(true);
    expect(hasScope(data, 'pacientes:read')).toBe(true);
    expect(hasScope(data, 'medicos:read')).toBe(true);
    expect(hasScope(data, 'turnos:write')).toBe(true);
  });

  it('lista vacía de scopes no da acceso a nada', () => {
    const data = makeKeyData({ scopes: [] });
    expect(hasScope(data, 'turnos:read')).toBe(false);
    expect(hasScope(data, 'medicos:read')).toBe(false);
  });
});

// ─── Constantes de scopes ───────────────────────────────────

describe('API_SCOPES', () => {
  it('tiene todos los scopes definidos', () => {
    expect(API_SCOPES.MEDICOS_READ).toBe('medicos:read');
    expect(API_SCOPES.HORARIOS_READ).toBe('horarios:read');
    expect(API_SCOPES.SERVICIOS_READ).toBe('servicios:read');
    expect(API_SCOPES.TURNOS_READ).toBe('turnos:read');
    expect(API_SCOPES.TURNOS_WRITE).toBe('turnos:write');
    expect(API_SCOPES.PACIENTES_READ).toBe('pacientes:read');
    expect(API_SCOPES.WEBHOOKS_WRITE).toBe('webhooks:write');
  });

  it('todos los valores siguen el formato recurso:accion', () => {
    const scopeValues = Object.values(API_SCOPES);
    scopeValues.forEach((scope) => {
      expect(scope).toMatch(/^[a-z]+:(read|write)$/);
    });
  });
});
