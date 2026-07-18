'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Client-side theme manager.
 * Works alongside TenantProvider (server-side CSS injection).
 * Handles dark mode CSS var overrides when next-themes toggles .dark class.
 */
export function TenantTheme() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const style = document.getElementById('tenant-theme-vars');
    if (!style) return;

    // Read current tenant CSS vars from the style tag content
    const content = style.textContent || '';
    const primaryMatch = content.match(/--tenant-primary-hsl:\s*([^;]+)/);
    const secondaryMatch = content.match(/--tenant-secondary-hsl:\s*([^;]+)/);

    if (!primaryMatch) return;

    const primaryHsl = primaryMatch[1].trim();
    const secondaryHsl = secondaryMatch ? secondaryMatch[1].trim() : null;
    const hue = parseInt(primaryHsl.split(' ')[0]);

    const isDark = resolvedTheme === 'dark' || root.classList.contains('dark');

    if (isDark) {
      // Override for dark mode: use same hue but adjusted lightness/saturation
      root.style.setProperty('--primary', `${hue} 72% 50%`);
      if (secondaryHsl) {
        const secHue = parseInt(secondaryHsl.split(' ')[0]);
        root.style.setProperty('--secondary', `${secHue} 65% 45%`);
      }
    }
    // Theme-color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const primaryHex = content.match(/--tenant-primary:\s*([^;]+)/)?.[1]?.trim() || '#2563eb';
      metaTheme.setAttribute('content', primaryHex);
    }
  }, [resolvedTheme]);

  return null;
}
