const CACHE_NAME = 'rafiquk-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass caching on localhost/development environment to prevent caching Vite assets
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.port === '3000' || url.port === '5173') {
    return; // Don't call event.respondWith() to let browser handle natively
  }

  // Bypass API requests to prevent caching issues, frontend will handle API offline states
  // Also bypass any requests to the api subdomain directly to prevent CORS/SW issues
  if (url.pathname.includes('/api/') || url.hostname === 'api.rafiquka.com') {
    return; // Don't call event.respondWith() to let browser handle natively
  }

  // Bypass version.json to always hit the server for freshness detection
  if (url.pathname === '/version.json') {
    return;
  }

  // Network First for HTML pages to ensure latest version is fetched
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then((response) => {
          // Update the cache with the latest response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cached index.html if offline
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle static assets caching dynamically (Cache First)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        // Cache same-origin static files, OR external fonts and icons
        const isCORSFontOrIcon = response.type === 'cors' || response.type === 'opaque';
        const isTargetExternal = url.hostname.includes('fonts.googleapis.com') || 
                                 url.hostname.includes('fonts.gstatic.com') || 
                                 url.hostname.includes('icons8.com');

        if (response.type !== 'basic' && !(isCORSFontOrIcon && isTargetExternal)) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Removed the navigate fallback from here since it's handled above
      });
    })
  );
});
