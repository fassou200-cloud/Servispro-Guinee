// ServisPro Service Worker v2 - PWA Offline Support
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `servispro-static-${CACHE_VERSION}`;
const API_CACHE = `servispro-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `servispro-images-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Core files to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes to cache for offline browsing
const CACHEABLE_API_ROUTES = [
  '/api/marketplace/shops',
  '/api/marketplace/products',
  '/api/marketplace/categories',
  '/api/services',
  '/api/rental-listings'
];

// Install - pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(name)) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler with different strategies per resource type
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin (except images from known CDNs)
  if (url.origin !== self.location.origin && !isKnownImageCDN(url)) return;

  // Strategy: API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstThenCache(event.request, API_CACHE));
    return;
  }

  // Strategy: Images - Cache first, fallback to network
  if (isImageRequest(event.request, url)) {
    event.respondWith(cacheFirstThenNetwork(event.request, IMAGE_CACHE));
    return;
  }

  // Strategy: Static assets & navigation - Stale while revalidate
  event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
});

// Network first, cache fallback (for API)
async function networkFirstThenCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Cache successful API responses
      if (isCacheableAPI(request.url)) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (err) {
    // Offline - try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Hors ligne', offline: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache first, network fallback (for images)
async function cacheFirstThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 503 });
  }
}

// Stale while revalidate (for static/navigation)
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(async (response) => {
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // Return cached version immediately, update in background
    fetchPromise; 
    return cached;
  }

  // No cache, wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  // Offline fallback for navigation
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_URL);
  }
  return new Response('Hors ligne', { status: 503 });
}

// Helper: Check if URL is a cacheable API route
function isCacheableAPI(url) {
  return CACHEABLE_API_ROUTES.some(route => url.includes(route));
}

// Helper: Check if request is for an image
function isImageRequest(request, url) {
  const accept = request.headers.get('accept') || '';
  const ext = url.pathname.split('.').pop().toLowerCase();
  return accept.includes('image') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
}

// Helper: Check if URL is from a known image CDN
function isKnownImageCDN(url) {
  return url.hostname.includes('cloudinary.com') || 
         url.hostname.includes('customer-assets.emergentagent.com');
}

// Push notification
self.addEventListener('push', (event) => {
  let data = { title: 'ServisPro', body: 'Nouvelle notification' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ServisPro', {
      body: data.body || 'Vous avez une nouvelle notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'servispro-notification',
      data: { url: data.url || '/' }
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  console.log('[ServiceWorker] Syncing pending requests...');
}
