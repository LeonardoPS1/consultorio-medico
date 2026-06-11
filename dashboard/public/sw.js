// AiCoreMed — Service Worker v4
// - v4: Fix POST/PUT/DELETE no se cachean (request.body consumido causaba 503)
// Estrategia: Cache first para assets con hash, Network first para API/navegación
// Offline: fallback a página offline.html

const CACHE_NAME = 'aicoremed-v4';
const STATIC_CACHE = 'aicoremed-static-v4';
const API_CACHE = 'aicoremed-api-v4';

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
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Solo cachear GET (idempotente). POST/PUT/DELETE mutan datos,
    // y su body se consume al hacer fetch, causando error en cache.put.
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      const cacheKey = request.clone(); // Clonar para no reusar body consumido
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    // Solo devolver cache para GET, no para POST/PUT/DELETE
    if (request.method === 'GET') {
      try {
        const cached = await caches.match(request);
        if (cached) return cached;
      } catch {
        // Si falla cache.match, seguir
      }
      if (request.mode === 'navigate') {
        try {
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
        } catch {
          // Si falla, seguir
        }
      }
    }
    return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      // Revalidar en background sin bloquear
      fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
        })
        .catch(() => {});
      return cached;
    }
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
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
