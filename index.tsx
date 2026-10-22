
/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Immediate version freshness check — runs BEFORE anything else renders.
// Fetches version.json (bypassing all caches) and compares to stored version.
// If the build version changed, it clears old SW caches and force-reloads to get the new build.
if (import.meta.env.PROD) {
  const savedVersion = localStorage.getItem('app_build_version');
  fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.v) {
        const serverVersion = String(data.v);
        if (savedVersion && savedVersion !== serverVersion) {
          console.log(`🔄 New build detected: ${savedVersion} → ${serverVersion}. Force reloading...`);
          localStorage.setItem('app_build_version', serverVersion);
          // Check pending sync queue before reloading
          const pendingQueue = localStorage.getItem('pending_sync_queue');
          const queue = pendingQueue ? JSON.parse(pendingQueue) : [];
          if (queue.length > 0) {
            // Data is pending — defer the reload, the sync flusher in GlobalState will handle it
            localStorage.setItem('sw_update_ready', 'true');
            console.log('Deferring reload: pending sync queue has', queue.length, 'items');
          } else {
            // No pending data — safe to clear caches and reload immediately
            const hasCaches = typeof caches !== 'undefined';
            if (hasCaches) {
              caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
                window.location.reload();
              });
            } else {
              window.location.reload();
            }
            return; // Stop execution, page will reload
          }
        } else if (!savedVersion) {
          // First visit — just store the version
          localStorage.setItem('app_build_version', serverVersion);
        }
      }
    })
    .catch(() => { /* Offline or fetch failed — continue with cached version */ });
}

// Register Service Worker for PWA offline capabilities (production only)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // 1. Listen for controller changes and reload the page automatically to load new assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        // Check if there are pending items in the offline sync queue
        const savedQueue = localStorage.getItem('pending_sync_queue');
        const queue = savedQueue ? JSON.parse(savedQueue) : [];
        
        // If there are unsaved items in the queue, do NOT reload to prevent data loss or sync interruption
        if (queue.length > 0) {
          console.log('Skipping auto-reload because there are pending offline sync items:', queue.length);
          localStorage.setItem('sw_update_ready', 'true');
          return;
        }
        
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('Service Worker registered successfully with scope:', registration.scope);
          
          // 2. Force check for updates on page load
          registration.update().catch(err => console.debug("Initial update check failed:", err));

          // 3. Check for updates periodically every 5 minutes in background
          setInterval(() => {
            if (navigator.onLine) {
              registration.update().catch(err => console.debug("Periodic update check failed:", err));
            }
          }, 5 * 60 * 1000);

          // 4. Check for updates when tab gains focus or becomes visible (very important for mobile apps resume)
          const triggerUpdateCheck = () => {
            if (navigator.onLine) {
              registration.update().catch(err => console.debug("Focus/Visibility update check failed:", err));
            }
          };
          window.addEventListener('focus', triggerUpdateCheck);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              triggerUpdateCheck();
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  } else {
    // Unregister any active service worker in development to avoid caching Vite dev assets
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let unregistered = false;
      for (const registration of registrations) {
        registration.unregister();
        unregistered = true;
      }
      if (unregistered) {
        console.log('Unregistered active service workers in development mode.');
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
        window.location.reload();
      }
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
