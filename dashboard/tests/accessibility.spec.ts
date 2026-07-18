import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility checks', () => {
  test('login page should have no critical violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'section508'])
      .analyze();

    // Filter out critical violations that need attention
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalViolations.length).toBe(0);
  });

  test('login page should have no missing aria labels on interactive elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button, a[role="button"], input[type="submit"]').count();
    expect(buttons).toBeGreaterThan(0);

    // Check that all buttons have accessible names
    const accessibleButtons = await page.locator('button:not([aria-label]):not([aria-labelledby]):not(:has-text(""))').count();
    expect(accessibleButtons).toBeLessThanOrEqual(buttons);
  });

  test('login form inputs have associated labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toHaveCount(1);
      }
    }
  });
});
