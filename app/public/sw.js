// Service worker de Remesas IA: recibe notificaciones push (Web Push) aunque
// la app/pestaña esté cerrada y las muestra como aviso flotante con sonido y
// vibración del sistema. Lo envía el servidor (supabase/functions/_shared/push.ts).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch (e) {
    datos = { cuerpo: event.data ? event.data.text() : '' };
  }
  const titulo = datos.titulo || 'Remesas IA';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || '',
      icon: '/app-icon.png',
      badge: '/app-icon.png',
      // Misma etiqueta = reemplaza el aviso anterior de esa solicitud, pero
      // renotify vuelve a hacer sonar/vibrar.
      tag: datos.tag || 'remesas-ia',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [400, 200, 400, 200, 400],
      data: { url: datos.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ('focus' in v) return v.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
