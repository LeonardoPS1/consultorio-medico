/**
 * Portal Push Notification Toggle
 * Componente para suscribir/desuscribir a notificaciones push
 */

'use client';

import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

/**
 *
 */
export function PushNotificationToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const cargarEstado = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/push/status');
      if (res.ok) {
        const data = await res.json() as { subscribed?: boolean; publicKey?: string };
        setSubscribed(data.subscribed ?? false);
        setPublicKey(data.publicKey ?? '');
      }
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras fetch asincrono en mount
    cargarEstado();
  }, [cargarEstado]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const suscribir = async () => {
    if (!publicKey) {
      return;
    }
    if (permission === 'denied') {
      return;
    }

    setToggling(true);

    try {
      // Pedir permiso si es necesario
      if (permission === 'default') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') {
          return;
        }
      }

      // Registrar service worker
      const registration = await navigator.serviceWorker.ready;

      // Suscribir
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subData = {
        endpoint: subscription.endpoint,
        keys: {
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        },
      };

      const res = await fetch('/api/portal/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subData, userAgent: navigator.userAgent }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || 'Error al suscribir');
      }

      setSubscribed(true);
    } catch {
      // Error silently handled
    } finally {
      setToggling(false);
    }
  };

  const desuscribir = async () => {
    setToggling(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch('/api/portal/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });

      setSubscribed(false);
    } catch {
      // Error silently handled
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-portal-muted-fg" />
        <span className="text-sm text-portal-muted-fg">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-portal-bg-alt rounded-xl border border-portal-border-light">
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="h-6 w-6 text-portal-primary" />
        ) : (
          <BellOff className="h-6 w-6 text-portal-muted-fg" />
        )}
        <div>
          <p className="font-medium text-portal-fg">Notificaciones Push</p>
          <p className="text-xs text-portal-muted-fg">
            {subscribed
              ? 'Recibirás avisos de turnos, recetas y novedades'
              : 'Activá para recibir avisos en tu dispositivo'}
          </p>
        </div>
      </div>

      <button
        onClick={subscribed ? desuscribir : suscribir}
        disabled={toggling || permission === 'denied'}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          subscribed
            ? 'bg-portal-muted text-portal-fg hover:bg-portal-muted-fg/20'
            : 'bg-gradient-to-r from-portal-primary to-portal-accent text-white hover:opacity-90'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {toggling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <>
            <BellOff className="h-4 w-4" />
            Desactivar
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            Activar
          </>
        )}
      </button>
    </div>
  );
}
