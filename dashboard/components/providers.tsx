'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';
import { SoundProvider } from '@/components/sound-provider';
import { SmartTooltipProvider } from '@/components/ui/smart-tooltip';
import { FeatureFlagsProvider, UserFeatureOverridesProvider } from '@/lib/feature-flags-context';
import { SucursalProvider } from '@/lib/sucursal-context';
import { UpdateProvider } from '@/lib/update-context';

/**
 *
 * @param root0
 * @param root0.children
 */
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
              <SoundProvider>
                {children}
              </SoundProvider>
              </SmartTooltipProvider>
            </UpdateProvider>
            </SucursalProvider>
          </UserFeatureOverridesProvider>
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
