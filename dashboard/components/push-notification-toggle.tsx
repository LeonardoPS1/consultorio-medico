'use client';

import { useEffect, useState, useCallback } from 'react';
import { BellRing, BellOff, Loader2, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';

export function PushNotificationToggle() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'inactive' | 'subscribed' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Obtener la VAPID public key
  const getPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/notificaciones/push?action=public-key');
      if (!res.ok) return null;
      const data = await res.json();
      return data.configured ? data.publicKey : null;
    } catch {
      return null;
    }
  }, []);

  // Convertir VAPID public key a Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array(Array.from(rawData).map((char) => char.charCodeAt(0)));
  };

  const subscribe = useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMessage('');

      // 1. Verificar que VAPID esté configurado
      const publicKey = await getPublicKey();
      if (!publicKey) {
        setErrorMessage('Las notificaciones push no están configuradas en el servidor.');
        setStatus('error');
        return;
      }

      // 2. Esperar Service Worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch {
        setErrorMessage('El Service Worker no está disponible. Recargá la página e intentá de nuevo.');
        setStatus('error');
        return;
      }

      // 3. Solicitar permiso si no lo está
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setStatus('denied');
          return;
        }
      }

      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }

      // 4. Suscribir al PushManager
      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });
      } catch (err: any) {
        if (err?.name === 'InvalidCharacterError' || err?.message?.includes('applicationServerKey')) {
          setErrorMessage('La clave de notificaciones no es válida. Contactá al administrador.');
        } else if (err?.name === 'NotAllowedError') {
          setStatus('denied');
          return;
        } else {
          setErrorMessage(`Error al suscribir: ${err?.message || 'desconocido'}`);
        }
        setStatus('error');
        return;
      }

      const subJSON = subscription.toJSON();

      // 5. Guardar en el servidor
      const res = await fetch('/api/notificaciones/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription: {
            endpoint: subJSON.endpoint,
            keys: subJSON.keys,
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.error || 'Error al guardar la suscripción en el servidor.');
        setStatus('error');
        return;
      }

      setStatus('subscribed');
    } catch (error: any) {
      console.error('[Push] Error al suscribir:', error);
      setErrorMessage(error?.message || 'Error desconocido al activar notificaciones.');
      setStatus('error');
    }
  }, [getPublicKey]);

  const unsubscribe = useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMessage('');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Primero avisar al servidor
        await fetch('/api/notificaciones/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unsubscribe',
            endpoint: subscription.endpoint,
          }),
        }).catch(() => {});

        await subscription.unsubscribe();
      }

      setStatus('inactive');
    } catch (error) {
      console.error('[Push] Error al desuscribir:', error);
      setStatus('subscribed');
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setStatus('subscribed');
      } else {
        setStatus('inactive');
      }
    } catch {
      setStatus('inactive');
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => checkSubscription());
    } else {
      setStatus('unsupported');
    }
  }, [checkSubscription]);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Configurando...</span>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="w-4 h-4" />
        <span>No soportado en este navegador</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-xs">{errorMessage}</span>
        <button
          onClick={subscribe}
          className="ml-auto shrink-0 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3 inline mr-0.5" />
          Reintentar
        </button>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <BellOff className="w-4 h-4 shrink-0" />
        <span className="text-xs">
          Bloqueadas.{' '}
          <button
            onClick={() => {
              Notification.requestPermission().then((perm) => {
                if (perm === 'granted') subscribe();
              });
            }}
            className="underline hover:text-amber-700"
          >
            Permitir
          </button>
        </span>
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <BellRing className="w-4 h-4 text-green-600 shrink-0" />
        <span className="text-xs text-muted-foreground">Activadas</span>
        <button
          onClick={unsubscribe}
          className="ml-auto text-xs text-muted-foreground/60 hover:text-foreground underline"
        >
          Desactivar
        </button>
      </div>
    );
  }

  // inactive
  return (
    <div className="flex items-center gap-2 text-sm">
      <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">Desactivadas</span>
      <button
        onClick={subscribe}
        className="ml-auto text-xs font-medium text-primary hover:text-primary/80 underline"
      >
        Activar
      </button>
    </div>
  );
}
