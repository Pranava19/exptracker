// Kill-switch service worker to decommission previously installed workers
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Claim all active clients immediately
      if (self.clients && self.clients.claim) {
        await self.clients.claim();
      }

      // 2. Clear all cache storages
      if ('caches' in self) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      // 3. Unregister this service worker
      if (self.registration) {
        await self.registration.unregister();
      }

      // 4. Force reload open window clients so they fetch fresh assets
      if (self.clients && self.clients.matchAll) {
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of windowClients) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        }
      }
    })()
  );
});

// Do not intercept or cache any fetch requests
self.addEventListener('fetch', () => {
  // Pass through to network
});
