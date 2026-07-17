import { test, expect } from '@playwright/test';

test.describe('Webhook WhatsApp - Flujo entrante', () => {
  test('POST /api/webhooks/twilio rechaza sin firma válida', async ({ request }) => {
    const res = await request.post('/api/webhooks/twilio', {
      data: { From: 'whatsapp:+56912345678', Body: 'Hola' },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('GET /api/health responde ok con postgres', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.checks).toBeDefined();
    expect(body.checks.postgres).toBeDefined();
  });

  test('GET /api/health/deep responde con checks detallados', async ({ request }) => {
    const res = await request.get('/api/health/deep');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.checks).toHaveProperty('postgres');
    expect(body.checks).toHaveProperty('n8n');
    expect(body.checks).toHaveProperty('ollama');
    expect(body.checks).toHaveProperty('twilio');
  });
});
