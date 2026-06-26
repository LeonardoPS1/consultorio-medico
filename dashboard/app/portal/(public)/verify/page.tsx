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

export default function PortalVerify() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'hsl(var(--portal-bg))' }}
        >
          <Loader2
            className="h-10 w-10 animate-spin"
            style={{ color: 'hsl(var(--portal-primary))' }}
          />
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'hsl(var(--portal-bg))' }}
    >
      <div
        className="max-w-sm w-full rounded-2xl p-8 text-center"
        style={{
          background: 'var(--portal-bg-alt)',
          border: '1px solid hsl(var(--portal-border))',
          boxShadow: 'var(--portal-shadow-lg)',
        }}
      >
        {verifying ? (
          <>
            <div
              className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
              style={{
                background: 'hsl(var(--portal-primary) / 0.1)',
              }}
            >
              <ShieldCheck
                className="h-10 w-10 animate-pulse"
                style={{ color: 'hsl(var(--portal-primary))' }}
              />
            </div>
            <p
              className="text-base font-medium"
              style={{ color: 'hsl(var(--portal-foreground))' }}
            >
              Verificando acceso...
            </p>
            <div className="mt-6 flex justify-center">
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: 'hsl(var(--portal-muted-foreground))' }}
              />
            </div>
          </>
        ) : (
          <>
            <div
              className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
              style={{
                background: 'hsl(var(--portal-destructive) / 0.1)',
              }}
            >
              <AlertCircle
                className="h-10 w-10"
                style={{ color: 'hsl(var(--portal-destructive))' }}
              />
            </div>
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: 'hsl(var(--portal-foreground))' }}
            >
              Enlace inválido
            </h1>
            <p
              className="text-sm mb-6"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              {error}
            </p>
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                color: '#fff',
                boxShadow:
                  '0 4px 12px hsl(var(--portal-primary) / 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 6px 20px hsl(var(--portal-primary) / 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 12px hsl(var(--portal-primary) / 0.25)';
              }}
            >
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
