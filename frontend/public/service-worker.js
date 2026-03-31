// ServisPro Service Worker v3 - PWA with SPA Navigation Support
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `servispro-static-${CACHE_VERSION}`;
const API_CACHE = `servispro-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `servispro-images-${CACHE_VERSION}`;

// Core files to pre-cache (must exist)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// API routes worth caching for offline
const CACHEABLE_API_PATTERNS = [
  '/api/marketplace/shops',
  '/api/marketplace/products',
  '/api/marketplace/categories',
  '/api/services',
  '/api/rentals'
];

// ===================== INSTALL =====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ===================== ACTIVATE =====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('servispro-') && ![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ===================== FETCH =====================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1) SPA Navigation: Any same-origin HTML navigation → serve index.html
  if (event.request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh index.html
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put('/index.html', clone));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(cached => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // 2) API requests: Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && isCacheableAPI(url.pathname)) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached =>
            cached || new Response(JSON.stringify({ error: 'offline', message: 'Vous êtes hors ligne' }), {
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
    );
    return;
  }

  // 3) Images: Cache first, network fallback
  if (isImageRequest(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // 4) Static assets (JS, CSS, fonts): Stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});

// ===================== HELPERS =====================
function isCacheableAPI(pathname) {
  return CACHEABLE_API_PATTERNS.some(pattern => pathname.startsWith(pattern));
}

function isImageRequest(url) {
  const ext = url.pathname.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico'].includes(ext) ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('customer-assets.emergentagent.com');
}

// ===================== PUSH NOTIFICATIONS =====================
self.addEventListener('push', (event) => {
  let data = { title: 'ServisPro', body: 'Nouvelle notification' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ServisPro', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
