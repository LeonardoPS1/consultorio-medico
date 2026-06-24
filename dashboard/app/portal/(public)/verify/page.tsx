/**
 * Portal — Verify Magic Link
 * Lee el token de la URL, lo valida contra la API,
 * y redirige al dashboard del portal.
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PortalVerify() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
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

  useEffect(() => {
    const token = searchParams?.get('token');
    const redirect = searchParams?.get('redirect');

    if (!token) {
      setError('Enlace inválido: falta el token de acceso.');
      return;
    }

    // Validar redirect (solo rutas del portal)
    const destino = redirect && redirect.startsWith('/portal/') ? redirect : '/portal/dashboard';

    fetch(`/api/portal/auth/verify?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.redirected) {
          window.location.href = res.url;
        } else if (res.ok) {
          router.push(destino);
        } else {
          return res.json().then((d) => d.error || 'Token inválido');
        }
      })
      .then((errMsg) => {
        if (typeof errMsg === 'string') setError(errMsg);
      })
      .catch(() => setError('Error de conexión'));
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/portal"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-6 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Verificando acceso...</p>
      </div>
    </div>
  );
}
