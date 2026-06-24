import { test, expect } from '@playwright/test';

test.describe('Smoke tests - Dashboard', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });

  test('health endpoint responds', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('deep health endpoint responds', async ({ page }) => {
    const response = await page.request.get('/api/health/deep');
    expect(response.ok()).toBeTruthy();
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
