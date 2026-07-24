// AiCoreMed — Service Worker
// Versión determinada por sw-version.js (auto-generado en cada build)
// Estrategia: Cache first para assets con hash, Network first para API/navegación
// Offline: fallback a página offline.html
// __SW_BUILD__: v3f6cefda

importScripts('/sw-version.js');

const CACHE_PREFIX = 'aicoremed';
const CACHE_NAME = `${CACHE_PREFIX}-${SW_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${SW_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-${SW_VERSION}`;

const PRECACHE_URLS = [
  '/offline.html',
  '/icons/icon-48x48.png',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192.svg',
  '/favicon.png',
];

// ─── INSTALACIÓN ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── MENSAJES DESDE LA APP ──────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'AiCoreMed';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-96x96.png',
      tag: data.tag || 'default',
      data: {
        url: data.url || '/',
        id: data.id || null,
        tipo: data.tipo || 'sistema',
      },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      silent: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Si no es JSON válido, mostrar el texto plano
    const title = 'AiCoreMed';
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// ─── CLICK EN NOTIFICACIÓN ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const id = event.notification.data?.id;

  // Enfocar o abrir la URL correspondiente
  const urlToOpen = id
    ? new URL(url, self.location.origin).href
    : new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        for (const client of clientList) {
          if (client.url.includes(self.location.host)) {
            return client.navigate(urlToOpen).then(() => client.focus());
          }
        }
        // Si no, abrir una nueva
        return clients.openWindow(urlToOpen);
      })
  );
});

// ─── ACTIVACIÓN ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── ESTRATEGIAS DE CACHE ───────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request).catch(() => null);
  if (cached) return cached;
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      const cacheKey = request.clone();
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    if (request.method === 'GET') {
      try {
        const cached = await caches.match(request);
        if (cached) return cached;
      } catch {
        // ignorar
      }
      if (request.mode === 'navigate') {
        try {
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
        } catch {
          // ignorar
        }
      }
    }
    return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(request) {
  let cache;
  try {
    cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      fetch(request, { signal: AbortSignal.timeout(8000) })
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
        })
        .catch(() => {});
      return cached;
    }
  } catch {
    // cache abierto, seguir sin él
  }
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (response.ok && cache) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ─── INTERCEPTOR FETCH ──────────────────────────────────────
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        const { request } = event;
        const url = new URL(request.url);

        // Solo interceptar requests del mismo origen
        if (url.origin !== self.location.origin) {
          return fetch(request);
        }

        // API calls → network first (con fallback)
        if (url.pathname.startsWith('/api/')) {
          return networkFirst(request);
        }

        // Assets Next.js con hash (chunks, JS, CSS) → cache first
        if (url.pathname.startsWith('/_next/static/')) {
          return cacheFirst(request);
        }

        // Imágenes de Next.js → cache first
        if (url.pathname.startsWith('/_next/image/')) {
          return cacheFirst(request);
        }

        // Assets estáticos (style, script, font, image) → cache first
        if (
          request.destination === 'style' ||
          request.destination === 'script' ||
          request.destination === 'font' ||
          request.destination === 'image'
        ) {
          return cacheFirst(request);
        }

        // Icons y favicon → cache first
        if (url.pathname.startsWith('/icons/') || url.pathname === '/favicon.png') {
          return cacheFirst(request);
        }

        // Navegación (páginas) → network first con fallback a offline
        if (request.mode === 'navigate') {
          return networkFirst(request);
        }

        // Otros (manifest, etc.) → stale-while-revalidate
        return staleWhileRevalidate(request);
      } catch {
        return fetch(event.request);
      }
    })()
  );
});
