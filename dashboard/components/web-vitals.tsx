'use client';

import { useEffect } from 'react';
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: { name: string; value: number; rating: string }) {
  // Enviar a consola en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
    return;
  }

  // En producción, enviar a /api/web-vitals (analytics endpoint)
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    url: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });

  // Usar sendBeacon para no bloquear el ciclo de vida de la página
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/web-vitals', body);
  } else {
    fetch('/api/web-vitals', { method: 'POST', body, keepalive: true });
  }
}

export function WebVitals() {
  useEffect(() => {
    onLCP(sendToAnalytics);
    onINP(sendToAnalytics);
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);

  return null;
}
