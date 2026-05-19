'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { canAccess, type FeatureId } from '@/lib/features';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft } from 'lucide-react';

interface Props {
  feature: FeatureId;
  children: React.ReactNode;
  /** Si se pasa, redirige a esta ruta en vez de mostrar el bloqueo */
  redirectTo?: string;
}

/**
 * Componente que protege secciones según el plan del usuario.
 * Si no tiene acceso, muestra un mensaje o redirige.
 */
export function RequireFeature({ feature, children, redirectTo }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const plan = session?.user?.plan ?? 'free';
  const hasAccess = canAccess(plan, feature);

  useEffect(() => {
    if (status !== 'loading' && !hasAccess && redirectTo) {
      router.replace(redirectTo);
    }
  }, [status, hasAccess, redirectTo, router]);

  // Mientras carga la sesión, no mostrar nada
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Si no tiene acceso y hay redirect, no renderizar nada (el useEffect redirige)
  if (!hasAccess && redirectTo) return null;

  // Si no tiene acceso, mostrar pantalla de bloqueo
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">Funcionalidad no disponible</h2>
            <p className="text-sm text-muted-foreground">
              Esta sección requiere un plan superior al que tenés actualmente.
              Actualizá tu plan para acceder a esta funcionalidad.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver al inicio
              </Button>
              <Button onClick={() => router.push('/dashboard/configuracion?tab=suscripcion')}>
                Ver planes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
