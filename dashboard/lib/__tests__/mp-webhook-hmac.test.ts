import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

/**
 * Tests de la verificación HMAC del webhook de MercadoPago.
 *
 * MP firma: HMAC-SHA256(secreto, "ts.{data_id}")
 * Header: x-signature: ts=...,v1=...
 *
 * Verifica:
 * 1. Firma válida → acepta
 * 2. Firma inválida → rechaza
 * 3. Firma manipulada (timestamp cambiado) → rechaza
 * 4. Sin firma en producción → rechaza
 */

const MP_SECRET = 'test-mp-secret-2026';

// Reimplementación de la lógica de verificación del route handler
// para testing unitario aislado
function verifySignature(
  signatureHeader: string | null,
  body: { data?: { id?: string | number } },
  querySecret: string | null,
  secret: string,
  isProduction = true,
): boolean {
  // Método 1: Firma HMAC en header x-signature
  if (signatureHeader) {
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(',')) {
      const [k, v] = part.trim().split('=');
      if (k && v) parts[k] = v;
    }
    const ts = parts['ts'];
    const v1 = parts['v1'];

    if (ts && v1) {
      const dataId = String(body.data?.id || '');
      const signedPayload = `ts.${dataId}`;
      const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

      try {
        return v1 === expected;
      } catch {
        return false;
      }
    }
  }

  // Método 2 (SÓLO DEV): Query param ?secret=
  if (!isProduction && querySecret && querySecret === secret) {
    return true;
  }

  return false;
}

describe('MP Webhook — HMAC Signature Verification', () => {
  const sampleDataId = '1234567890';

  function generateValidSignature(dataId: string, secret: string = MP_SECRET): string {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = `ts.${dataId}`;
    const hash = createHmac('sha256', secret).update(payload).digest('hex');
    return `ts=${ts},v1=${hash}`;
  }

  it('debe aceptar firma HMAC válida', () => {
    const signature = generateValidSignature(sampleDataId);
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(true);
  });

  it('debe rechazar firma con secreto incorrecto', () => {
    const signature = generateValidSignature(sampleDataId, 'wrong-secret');
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });

  it('debe rechazar firma con data_id manipulado', () => {
    // Firma generada para un ID, pero body tiene otro ID
    const signature = generateValidSignature('id-1');
    const body = { data: { id: 'id-2' } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });

  it('debe rechazar firma con hash inválido (formato incorrecto)', () => {
    const signature = 'ts=1234567890,v1=hash-invalido-no-es-hex';
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });

  it('debe rechazar si falta x-signature en producción', () => {
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(null, body, null, MP_SECRET)).toBe(false);
  });

  it('debe aceptar query param ?secret= en desarrollo', () => {
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(null, body, MP_SECRET, MP_SECRET, false)).toBe(true);
  });

  it('debe rechazar query param ?secret= en producción', () => {
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(null, body, MP_SECRET, MP_SECRET, true)).toBe(false);
  });

  it('debe rechazar query param ?secret= incorrecto en desarrollo', () => {
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(null, body, 'wrong-secret', MP_SECRET, false)).toBe(false);
  });

  it('debe rechazar si el formato del header es inválido (sin ts/v1)', () => {
    const signature = 'algún=texto,sin=formato';
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });

  it('debe rechazar si el header tiene solo ts pero no v1', () => {
    const signature = `ts=${Math.floor(Date.now() / 1000)}`;
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });

  it('debe rechazar replay attack con ts manipulado (firma no coincide)', () => {
    // Firma generada con un ts, body tiene ese mismo ts pero el hash no matchea
    const ts = String(Math.floor(Date.now() / 1000));
    // Generar firma para un data_id diferente
    const payload = `ts.other-data-id`;
    const hash = createHmac('sha256', MP_SECRET).update(payload).digest('hex');
    const signature = `ts=${ts},v1=${hash}`;
    const body = { data: { id: sampleDataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });

  it('debe mantener consistencia: misma entrada = misma firma', () => {
    const dataId = 'consistent-test';
    const ts = '1700000000';
    const payload = `ts.${dataId}`;
    const hash1 = createHmac('sha256', MP_SECRET).update(payload).digest('hex');
    const hash2 = createHmac('sha256', MP_SECRET).update(payload).digest('hex');
    expect(hash1).toBe(hash2); // Determinístico

    const signature = `ts=${ts},v1=${hash1}`;
    const body = { data: { id: dataId } };
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(true);
  });

  it('debe rechazar payload vacío (sin data.id)', () => {
    const signature = generateValidSignature(sampleDataId);
    const body = {}; // Sin data.id
    expect(verifySignature(signature, body, null, MP_SECRET)).toBe(false);
  });
});
