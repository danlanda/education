/* Service Worker – מקבל התראות ופותח את המסך הנכון כשלוחצים עליהן */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'שומרי הזמן', body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'שומרי הזמן', {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    dir: 'rtl',
    lang: 'he',
    tag: d.tag,
    requireInteraction: !!d.urgent,
    data: { url: d.url || '/admin' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { await c.navigate(url).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
