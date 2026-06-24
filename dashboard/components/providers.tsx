'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { FeatureFlagsProvider, UserFeatureOverridesProvider } from '@/lib/feature-flags-context';
import { SucursalProvider } from '@/lib/sucursal-context';
import { UpdateProvider } from '@/lib/update-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <FeatureFlagsProvider>
          <UserFeatureOverridesProvider>
            <SucursalProvider>
              <UpdateProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  {children}
                </ThemeProvider>
              </UpdateProvider>
            </SucursalProvider>
          </UserFeatureOverridesProvider>
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
