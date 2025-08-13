const CACHE_VERSION = 'v3'; // Updated for new icon set
const CACHE_NAME = `emoji-studio-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `emoji-studio-data-${CACHE_VERSION}`;

// Critical resources to cache on install
const urlsToCache = [
  '/',
  '/dashboard',
  '/my-emojis',
  '/explorer',
  '/leaderboard',
  '/visualizations',
  '/settings',
  '/create',
  '/apple-touch-icon.png',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/app-icon-1024.png',
  '/favicon.ico',
  '/favicon-16.png',
  '/favicon-32.png',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when possible with network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests except for critical API endpoints
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Cache successful API responses
          if (response.status === 200) {
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Try to return cached API response when offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // Skip external resources
  if (url.origin !== location.origin) {
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          // Fetch in background to update cache
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
          }).catch(() => {
            // Silently fail background update
          });
          
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        // Return cached version for other resources
        return caches.match(event.request);
      })
  );
});

// Background sync for offline emoji creation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emojis') {
    event.waitUntil(syncEmojis());
  }
});

async function syncEmojis() {
  // This will be implemented when we add offline emoji creation
  console.log('Syncing emojis...');
}