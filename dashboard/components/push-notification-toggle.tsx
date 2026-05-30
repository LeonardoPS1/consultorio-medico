'use client';

import { useEffect, useState, useCallback } from 'react';
import { BellRing, BellOff, Loader2, Smartphone } from 'lucide-react';

export function PushNotificationToggle() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'inactive' | 'subscribed'>('loading');
  const [subscribed, setSubscribed] = useState(false);

  // Obtener la URL base para VAPID
  const getPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/notificaciones/push?action=public-key');
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

      const publicKey = await getPublicKey();
      if (!publicKey) {
        setStatus('inactive');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const subJSON = subscription.toJSON();

      await fetch('/api/notificaciones/push', {
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

      setSubscribed(true);
      setStatus('subscribed');
    } catch (error) {
      console.error('[Push] Error al suscribir:', error);
      setStatus('denied');
    }
  }, [getPublicKey]);

  const unsubscribe = useCallback(async () => {
    try {
      setStatus('loading');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        await fetch('/api/notificaciones/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unsubscribe',
            endpoint,
          }),
        });

        await subscription.unsubscribe();
      }

      setSubscribed(false);
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
        setSubscribed(true);
        setStatus('subscribed');
      } else {
        setSubscribed(false);
        setStatus('inactive');
      }
    } catch {
      setStatus('inactive');
    }
  }, []);

  useEffect(() => {
    // Esperar a que el SW esté listo
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
        <span>Configurando notificaciones push...</span>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="w-4 h-4" />
        <span>Notificaciones push no soportadas en este navegador</span>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <BellOff className="w-4 h-4" />
        <span>
          Notificaciones bloqueadas.{' '}
          <button
            onClick={() => {
              Notification.requestPermission().then((perm) => {
                if (perm === 'granted') subscribe();
              });
            }}
            className="underline hover:text-amber-700"
          >
            Permitir desde el navegador
          </button>
        </span>
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <BellRing className="w-4 h-4 text-green-600" />
        <span className="text-muted-foreground">
          Notificaciones push activadas en este dispositivo
        </span>
        <button
          onClick={unsubscribe}
          className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
        >
          Desactivar
        </button>
      </div>
    );
  }

  // inactive
  return (
    <div className="flex items-center gap-2 text-sm">
      <BellOff className="w-4 h-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        Notificaciones push desactivadas en este dispositivo
      </span>
      <button
        onClick={subscribe}
        className="ml-auto text-xs font-medium text-primary underline hover:text-primary/80"
      >
        Activar
      </button>
    </div>
  );
}
