// AiCoreMed — Service Worker v2
// Estrategia: Cache first para assets con hash, Network first para API/navegación
// Offline: fallback a página offline.html

const CACHE_NAME = 'aicoremed-v2';
const STATIC_CACHE = 'aicoremed-static-v2';
const API_CACHE = 'aicoremed-api-v2';

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
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match('/offline.html');
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Para navegación, servir offline.html
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ─── INTERCEPTOR FETCH ──────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar requests del mismo origen
  if (url.origin !== self.location.origin) return;

  // API calls → network first (con fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets Next.js con hash (chunks, JS, CSS) → cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Imágenes de Next.js → cache first
  if (url.pathname.startsWith('/_next/image/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Assets estáticos (style, script, font, image) → cache first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Icons y favicon → cache first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/favicon.png') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navegación (páginas) → network first con fallback a offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Otros (manifest, etc.) → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});
