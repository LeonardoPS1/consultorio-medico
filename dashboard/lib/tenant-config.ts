/**
 * Configuración del tenant desde variables de entorno.
 * En Phase 1 se lee de env vars (build-time).
 * En Phase 2+ se leerá de la tabla `tenants` (runtime, por subdomain).
 */

export interface TenantConfig {
  nombre: string;
  colorPrimario: string; // hex
}

export function getTenantConfig(): TenantConfig {
  return {
    nombre: process.env.NEXT_PUBLIC_TENANT_NAME || 'Consultorio',
    colorPrimario: process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb',
  };
}

/**
 * Convierte un color hex a HSL string para usar en CSS variables.
 * Ej: #2563eb → "221.2 83.2% 53.3%"
 */
export function hexToHsl(hex: string): string {
  // Remover #
  hex = hex.replace('#', '');

  // Convertir a RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}
