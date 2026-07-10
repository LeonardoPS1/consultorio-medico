'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { FeatureFlagsProvider, UserFeatureOverridesProvider } from '@/lib/feature-flags-context';
import { SucursalProvider } from '@/lib/sucursal-context';
import { UpdateProvider } from '@/lib/update-context';
import { SmartTooltipProvider } from '@/components/ui/smart-tooltip';

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
              <SmartTooltipProvider>
                {children}
              </SmartTooltipProvider>
            </UpdateProvider>
            </SucursalProvider>
          </UserFeatureOverridesProvider>
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
