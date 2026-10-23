const CACHE_NAME = 'rafiquk-v1792727364008';
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/AboutProgramPage-Ca5U-bej.js",
  "/assets/CommunicationDevPage-B77eE4pD.js",
  "/assets/ComprehensiveReportsPage-CIFY4Fa9.js",
  "/assets/DeliveryReceiptView-Zx1Ahf76.js",
  "/assets/EducationalSupervisionPage-BZLNjJ5n.js",
  "/assets/FileSaver.min-uy3EzI7x.js",
  "/assets/FinancePage-DFxr4nb_.js",
  "/assets/IntroPage-DTyr2S2L.js",
  "/assets/ProfilePage-BxKhq3E7.js",
  "/assets/ReportsPage-BL4oxMDY.js",
  "/assets/SchoolActivitiesPage-6rkIFTvb.js",
  "/assets/SpecialReportsPage-DOPojUX8.js",
  "/assets/StaffFollowUpPage-DsbAA8SP.js",
  "/assets/SubstitutionPage-CxpKozQ9.js",
  "/assets/TeacherPortalPage-CkFqC9eK.js",
  "/assets/TransportPage-IsMOTc_R.js",
  "/assets/archive-BLZURYjj.js",
  "/assets/chart-column-CKSTDzMs.js",
  "/assets/chevron-up-BHHHrwZH.js",
  "/assets/circle-check-big-BxD-Rrkb.js",
  "/assets/circle-user-B8G_rR_q.js",
  "/assets/excelExport-CfeOVQEk.js",
  "/assets/exceljs.min-XqW-3m6b.js",
  "/assets/eye-a0t7tjNN.js",
  "/assets/file-pen-line-B1dw8z9V.js",
  "/assets/layout-list-DmA6wfBM.js",
  "/assets/main-BqbZLIWj.css",
  "/assets/main-DhuudjoG.js",
  "/assets/palette-tWh9Nw3F.js",
  "/assets/pen-line-BgxCpBxC.js",
  "/assets/pen-tool-DmADynSB.js",
  "/assets/send-D_KRBUsW.js",
  "/assets/square-check-big-DgMDXs1x.js",
  "/assets/table-DN16Ik0E.js",
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
