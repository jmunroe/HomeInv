// Service Worker for Home Inventory App
const CACHE_NAME = 'home-inventory-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Handle share target POST requests
  if (event.request.method === 'POST' && event.request.url.endsWith('/')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Regular fetch handling
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Handle shared files from iOS/Android share sheet
async function handleShareTarget(request) {
  const formData = await request.formData();
  const file = formData.get('backup');

  if (file) {
    // Store the file data temporarily
    const fileData = await file.text();

    // Get all clients (browser tabs/windows with this app open)
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Send the file data to all clients
    clients.forEach(client => {
      client.postMessage({
        type: 'SHARED_FILE',
        file: {
          name: file.name,
          type: file.type,
          data: fileData
        }
      });
    });

    // Redirect to the app
    return Response.redirect('/?shared=true', 303);
  }

  // If no file, just show the app
  return Response.redirect('/', 303);
}
