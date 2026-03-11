// EduManager Pro — Service Worker
const CACHE_NAME = 'edumgr-v1';
const STATIC_ASSETS = [
  './etablissement.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Installation — mise en cache des assets statiques
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache l'HTML principal (les CDN peuvent échouer en offline — pas grave)
      return cache.add('./etablissement.html').catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Activation — nettoyer les anciens caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — stratégie Network First pour l'app, Cache First pour assets
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // Supabase API — toujours network (pas de cache)
  if (url.includes('supabase.co')) {
    return; // laisser passer sans interception
  }

  // Fonts Google — cache first
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // App principale — Network First, fallback cache
  if (url.includes('etablissement.html') || url.endsWith('/') || url.includes('localhost')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match('./etablissement.html'))
    );
    return;
  }

  // CDN (supabase-js, etc.) — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return res;
      }).catch(() => cached || new Response('Offline', {status: 503}));
    })
  );
});
