'use client';

import { ThemeProvider } from 'next-themes';

/**
 * Wrapper fino de next-themes para usar en sub-layouts.
 * Permite sacar ThemeProvider del root providers y solo envolver
 * las rutas que realmente necesitan theming (portal + dashboard).
 */
export function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
