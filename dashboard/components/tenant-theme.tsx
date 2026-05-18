'use client';

import { useEffect } from 'react';
import { hexToHsl } from '@/lib/tenant-config';

/**
 * Inyecta las variables CSS del tenant (color primario, etc.)
 * basadas en variables de entorno NEXT_PUBLIC_*.
 *
 * En Phase 1: se leen de env vars (build-time).
 * En Phase 2+: se leerán de la tabla tenants en DB.
 */
export function TenantTheme() {
  useEffect(() => {
    const root = document.documentElement;

    // Color primario desde env
    const primaryHex = process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb';
    const primaryHsl = hexToHsl(primaryHex);

    // Recalcular tonos derivados automáticamente
    // Extraer H (hue) para generar variantes armónicas
    const hue = parseInt(primaryHsl.split(' ')[0]);

    // --primary: el color base
    root.style.setProperty('--primary', primaryHsl);

    // --ring: mismo tono, saturación similar, brillo ajustado
    root.style.setProperty('--ring', `${hue} 83% 53%`);

    // Derivated tones for dark mode (we'll keep defaults mostly)
    // but set --primary for dark mode based on the hue
    if (document.querySelector('.dark')) {
      root.style.setProperty('--primary', `${hue} 91% 60%`);
    }

    // Theme-color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', primaryHex);
    }
  }, []);

  return null;
}
