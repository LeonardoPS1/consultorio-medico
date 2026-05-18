'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Solo registrar si no está ya registrado
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) {
          navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
        }
      });
    }
  }, []);

  return null;
}
