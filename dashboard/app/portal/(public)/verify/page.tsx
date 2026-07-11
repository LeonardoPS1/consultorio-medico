/**
 * Portal — Verify Magic Link
 * Lee el token de la URL, lo valida contra la API,
 * y redirige al dashboard del portal.
 * Premium redesign Aicore: glass card, matching design system.
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalButton } from '@/components/portal/portal-button';

export default function PortalVerify() {
  return (
    <Suspense
      fallback={
        <div className="portal-layout min-h-screen flex items-center justify-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-portal-primary" />
        </div>
      }
    >
      <PortalVerifyContent />
    </Suspense>
  );
}

function PortalVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const token = searchParams?.get('token');
    const redirect = searchParams?.get('redirect');

    if (!token) {
      setError('Enlace inválido: falta el token de acceso.');
      setVerifying(false);
      return;
    }

    const destino =
      redirect && redirect.startsWith('/portal/')
        ? redirect
        : '/portal/dashboard';

    fetch(
      `/api/portal/auth/verify?token=${encodeURIComponent(token)}`,
    )
      .then((res) => {
        if (res.redirected) {
          window.location.href = res.url;
        } else if (res.ok) {
          router.push(destino);
        } else {
          return res.json().then(
            (d) => d.error || 'Token inválido o expirado',
          );
        }
      })
      .then((errMsg) => {
        if (typeof errMsg === 'string') {
          setError(errMsg);
          setVerifying(false);
        }
      })
      .catch(() => {
        setError('Error de conexión');
        setVerifying(false);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 portal-layout">
      <PortalCard padding="lg" className="max-w-sm w-full text-center">
        {verifying ? (
          <>
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6 bg-portal-primary/10">
              <ShieldCheck className="h-10 w-10 animate-pulse text-portal-primary" />
            </div>
            <p className="text-base font-medium text-portal-fg">
              Verificando acceso...
            </p>
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-portal-muted-fg" />
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6 bg-portal-destructive/10">
              <AlertCircle className="h-10 w-10 text-portal-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2 text-portal-fg">
              Enlace inválido
            </h1>
            <p className="text-sm mb-6 text-portal-muted-fg">
              {error}
            </p>
            <PortalButton variant="primary" fullWidth onClick={() => router.push('/portal')}>
              Volver al inicio
            </PortalButton>
          </>
        )}
      </PortalCard>
    </div>
  );
}
