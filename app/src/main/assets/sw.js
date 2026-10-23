const CACHE_NAME = 'rafiquk-v1792780790139';
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/AboutProgramPage-XoXs0Oex.js",
  "/assets/CommunicationDevPage-DjGLMQlx.js",
  "/assets/ComprehensiveReportsPage-q9RF846i.js",
  "/assets/DeliveryReceiptView-CsSNO2S_.js",
  "/assets/EducationalSupervisionPage-CINOaOHx.js",
  "/assets/FileSaver.min-C0Kv1B-E.js",
  "/assets/FinancePage-C3-dsb_i.js",
  "/assets/IntroPage-N6orfFMB.js",
  "/assets/ProfilePage-DgOvBNr9.js",
  "/assets/ReportsPage-Bo3VZIyb.js",
  "/assets/SchoolActivitiesPage-XWYkJFrM.js",
  "/assets/SpecialReportsPage-COEgOTyO.js",
  "/assets/StaffFollowUpPage-BDNzCxxa.js",
  "/assets/SubstitutionPage-DiWTLzjh.js",
  "/assets/TeacherPortalPage-Cfw6_kq-.js",
  "/assets/TransportPage-BGhgddk8.js",
  "/assets/archive-fHBF3PQE.js",
  "/assets/chart-column-Bh1jX2pR.js",
  "/assets/chevron-up-BNHOjZqx.js",
  "/assets/circle-check-big-Cl52d87F.js",
  "/assets/circle-user-6ULLgcik.js",
  "/assets/excelExport-BvmKXeJb.js",
  "/assets/exceljs.min-SoE5rqgK.js",
  "/assets/eye-BBiNSGsh.js",
  "/assets/file-pen-line-DkCyYs5G.js",
  "/assets/layout-list-DINE4ikv.js",
  "/assets/main-CQYOWOy6.js",
  "/assets/main-DGSbZAUT.css",
  "/assets/palette-D7MP3ROa.js",
  "/assets/pen-line-Bz2SmViJ.js",
  "/assets/pen-tool-DMgaFvPt.js",
  "/assets/send-CNk86mp1.js",
  "/assets/square-check-big-D2yB5Ycu.js",
  "/assets/table-DxzaeSuj.js",
  "/icon-192.png",
  "/icon-512.png"
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
