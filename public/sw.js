const CACHE_NAME = 'secti-contratos-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first strategy with proper POST handling
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  
  // Let the browser handle POSTs and external APIs directly.
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Skip caching for Firebase/Firestore requests
  if (request.url.includes('firebaseio.com') || 
      request.url.includes('googleapis.com') ||
      request.url.includes('google.com/firestore')) {
    console.log('[SW] Skipping cache for Firebase request:', request.url);
    event.respondWith(fetch(request));
    return;
  }

  // Network-first strategy for GET requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Cache HIT:', request.url);
            return cachedResponse;
          }
          // If not in cache, return a basic offline page or error
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});
