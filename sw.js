const CACHE_NAME = 'phytoeco-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Cache all core assets during installation
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Intercept requests and serve from cache if available offline
self.addEventListener('fetch', event => {
    event.waitUntil(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});