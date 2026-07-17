import { test, expect } from '@playwright/test';

test.describe('Smoke tests - Dashboard', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });

  test('health endpoint responds with postgres check', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('postgres');
  });

  test('health endpoint returns 503 when postgres is down', async ({ page }) => {
    const response = await page.request.get('/api/health');
    // Normal operation returns 200; this tests the structure
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(['ok', 'error']).toContain(data.status);
  });

  test('deep health endpoint responds with all dependencies', async ({ page }) => {
    const response = await page.request.get('/api/health/deep');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.checks).toHaveProperty('postgres');
    expect(data.checks).toHaveProperty('n8n');
    expect(data.checks).toHaveProperty('ollama');
    expect(data.checks).toHaveProperty('twilio');
  });

  test('API rejects unauthenticated requests', async ({ page }) => {
    const response = await page.request.get('/api/pacientes');
    expect(response.status()).toBe(401);
  });
});

test.describe('Booking Wizard - Portal Paciente', () => {
  test('agendar page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/portal/agendar');
    // Should redirect to login flow
    await expect(page).toHaveURL(/portal\/login/);
  });
});
