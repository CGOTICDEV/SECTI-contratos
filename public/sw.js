const CACHE_NAME = 'secti-contratos-v2';
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

  // Never intercept non-GET requests.  POST/PUT/DELETE cannot be cached and
  // attempting cache.put on them throws "Request method POST is unsupported".
  // We return undefined so the browser handles the request normally.
  if (request.method !== 'GET') {
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch (e) {
    return;
  }

  // Let the browser handle external origins directly (Firebase, Google, etc.).
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Skip caching for Firebase/Firestore requests explicitly to be safe.
  if (request.url.includes('firebaseio.com') ||
      request.url.includes('googleapis.com') ||
      request.url.includes('google.com/firestore') ||
      request.url.includes('firestore')) {
    return;
  }

  // Network-first strategy for GET requests only.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        if (response && response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(request, responseToCache);
            } catch (e) {
              // ignore put errors (e.g. unsupported request methods)
            }
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
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
