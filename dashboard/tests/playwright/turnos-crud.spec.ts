import { test, expect } from '@playwright/test';

test.describe('Turnos - CRUD desde dashboard', () => {
  test('página de turnos redirige a login sin sesión', async ({ page }) => {
    await page.goto('/dashboard/turnos');
    await expect(page).toHaveURL(/\/login/);
  });

  test('API turnos rechaza sin autenticación', async ({ request }) => {
    const res = await request.get('/api/turnos');
    expect(res.status()).toBe(401);
  });

  test('API turnos rechaza POST sin autenticación', async ({ request }) => {
    const res = await request.post('/api/turnos', {
      data: { pacienteId: 'test', fecha: '2026-07-20', hora: '10:00' },
    });
    expect(res.status()).toBe(401);
  });
});
