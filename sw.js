const CACHE = 'cryptodesk-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Clash+Display:wght@400;500;600;700&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS.map(url => new Request(url, {mode:'no-cors'}))).catch(()=>{});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first, network fallback
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if(e.request.method !== 'GET') return;
  if(e.request.url.startsWith('chrome-extension')) return;

  // For API calls (CoinGecko, Binance, Anthropic) — always network first
  const isAPI = e.request.url.includes('api.coingecko') ||
                e.request.url.includes('api.binance') ||
                e.request.url.includes('api.anthropic');

  if(isAPI){
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}}))
    );
    return;
  }

  // For app files — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        if(response && response.status === 200){
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Background sync message
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
