import { headers } from 'next/headers';
import { getTenantBranding } from '@/lib/services/tenant';
import { hexToHsl } from '@/lib/tenant-config';

export async function TenantProvider() {
  const hdrs = await headers();
  const tenantId = hdrs.get('x-tenant-id') || undefined;
  const branding = await getTenantBranding(tenantId);
  const { primary, secondary } = branding.colores;

  const primaryHsl = hexToHsl(primary);
  const secondaryHsl = hexToHsl(secondary);
  const hue = parseInt(primaryHsl.split(' ')[0]);
  const secHue = parseInt(secondaryHsl.split(' ')[0]);

  // Derivar variantes para dark mode desde el mismo hue
  const primaryDark = `${hue} 72% 50%`;
  const secondaryDark = `${secHue} 65% 45%`;

  const css = `
:root {
  --tenant-primary: ${primary};
  --tenant-primary-hsl: ${primaryHsl};
  --tenant-secondary: ${secondary};
  --tenant-secondary-hsl: ${secondaryHsl};
  --primary: ${primaryHsl};
  --ring: ${hue} 83% 53%;
}
.dark {
  --primary: ${primaryDark};
  --tenant-secondary-dark: ${secondaryDark};
}
.meta-theme-color { color: ${primary}; }
`;

  return (
    <style id="tenant-theme-vars" dangerouslySetInnerHTML={{ __html: css }} />
  );
}
