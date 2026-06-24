import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyWebhookSecret, verifyRequestSecret } from '@/lib/verify-webhook-secret';

describe('verifyWebhookSecret', () => {
  it('debe retornar true si los strings coinciden exactamente', () => {
    expect(verifyWebhookSecret('secret-key-123', 'secret-key-123')).toBe(true);
  });

  it('debe retornar false si los strings difieren', () => {
    expect(verifyWebhookSecret('wrong-key', 'secret-key-123')).toBe(false);
  });

  it('debe retornar false si provided es null', () => {
    expect(verifyWebhookSecret(null, 'secret-key-123')).toBe(false);
  });

  it('debe retornar false si provided es undefined', () => {
    expect(verifyWebhookSecret(undefined, 'secret-key-123')).toBe(false);
  });

  it('debe retornar false si expected es empty string', () => {
    // Edge case: expected vacío — no debería coincidir
    expect(verifyWebhookSecret('secret-key-123', '')).toBe(false);
  });

  it('debe retornar false si provided es empty string', () => {
    expect(verifyWebhookSecret('', 'secret-key-123')).toBe(false);
  });

  it('debe ser constante para diferentes longitudes (timing-safe)', () => {
    // La función no debe filtrar la longitud del secret
    expect(verifyWebhookSecret('a', 'b')).toBe(false);
    expect(verifyWebhookSecret('aa', 'b')).toBe(false);
    expect(verifyWebhookSecret('aaa', 'b')).toBe(false);
    // Todas deben ser false sin importar la longitud
  });

  it('debe funcionar con secrets reales (con guiones y números)', () => {
    const secret = 'aicoremed-secret-key-2026-prod';
    expect(verifyWebhookSecret(secret, secret)).toBe(true);
    expect(verifyWebhookSecret(secret.toUpperCase(), secret)).toBe(false);
  });

  it('debe ser resistente a inyección de caracteres especiales', () => {
    expect(verifyWebhookSecret("'; DROP TABLE users;--", 'real-secret')).toBe(false);
    expect(verifyWebhookSecret('../etc/passwd', '../etc/passwd')).toBe(true);
  });
});

describe('verifyRequestSecret', () => {
  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = 'test-secret-env';
  });

  const mockRequest = (headerValue: string | null) =>
    ({
      headers: {
        get: (name: string) => {
          if (name === 'x-webhook-secret') return headerValue;
          return null;
        },
      },
    }) as any;

  it('debe retornar true si el header coincide con env var', () => {
    expect(verifyRequestSecret(mockRequest('test-secret-env'))).toBe(true);
  });

  it('debe retornar false si el header no coincide con env var', () => {
    expect(verifyRequestSecret(mockRequest('wrong-secret'))).toBe(false);
  });

  it('debe retornar false si el header es null', () => {
    expect(verifyRequestSecret(mockRequest(null))).toBe(false);
  });

  it('debe aceptar expectedSecret explícito (override env var)', () => {
    expect(verifyRequestSecret(mockRequest('custom-secret'), 'custom-secret')).toBe(true);
    expect(verifyRequestSecret(mockRequest('test-secret-env'), 'custom-secret')).toBe(false);
  });

  it('debe retornar false si la env var no está configurada', () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    expect(verifyRequestSecret(mockRequest('anything'))).toBe(false);
  });
});
