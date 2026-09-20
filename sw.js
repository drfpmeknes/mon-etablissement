// EduManager Pro — Service Worker
// v2 — exclut du cache toutes les adresses d'API (cloud ET Oracle),
//      et corrige le nom du fichier principal (index.html, pas etablissement.html).
const CACHE_NAME = 'edumgr-v2';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Toute requête dont l'adresse correspond ici ne doit JAMAIS etre mise en cache.
// Les chemins /rest/v1/ et /auth/v1/ couvrent n'importe quel serveur Supabase,
// hebergé ou auto-hebergé : c'est ce qui rend cette regle insensible au changement d'adresse.
function estAppelAPI(url) {
  return url.includes('supabase.co')
      || url.includes('duckdns.org')
      || url.includes('/rest/v1/')
      || url.includes('/auth/v1/')
      || url.includes('/storage/v1/')
      || url.includes('/realtime/v1/');
}

// Installation — mise en cache des assets statiques
self.addEventListener('install', function(event) {
  console.log('[SW] Installing ' + CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.add('./index.html').catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Activation — nettoyer les anciens caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating ' + CACHE_NAME);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — Network First pour l'app, Cache First pour les assets
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // 1. Appels a la base de donnees — jamais de cache, quelle que soit l'adresse
  if (estAppelAPI(url)) {
    return; // laisser passer sans interception
  }

  // 2. Polices Google — cache first
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

  // 3. Application principale — Network First, repli sur le cache
  if (url.includes('index.html') || url.endsWith('/') || url.includes('localhost')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. CDN (supabase-js, etc.) — cache first
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
