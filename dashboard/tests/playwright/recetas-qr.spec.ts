import { test, expect } from '@playwright/test';

test.describe('Recetas - Firma QR y verificación pública', () => {
  test('portal de verificación pública carga correctamente', async ({ page }) => {
    await page.goto('/verificar-receta/invalid-hash');
    await expect(page.locator('text=Receta no encontrada').or(page.locator('text=inválida'))).toBeVisible();
  });

  test('API recetas rechaza sin autenticación', async ({ request }) => {
    const res = await request.get('/api/recetas');
    expect(res.status()).toBe(401);
  });

  test('API recetas rechaza POST sin autenticación', async ({ request }) => {
    const res = await request.post('/api/recetas', {
      data: { pacienteId: 'test', medicamento: 'Paracetamol' },
    });
    expect(res.status()).toBe(401);
  });
});
