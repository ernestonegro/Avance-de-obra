/* Manejo de notificaciones push. Lo importa el service worker generado por vite-plugin-pwa. */

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = { body: evento.data ? evento.data.text() : '' }
  }
  evento.waitUntil(
    self.registration.showNotification(datos.title || 'Bitácora de Obra', {
      body: datos.body || 'Hay un nuevo avance',
      icon: '/icono-192.png',
      image: datos.image,
      tag: datos.tag,
      renotify: Boolean(datos.tag),
      data: { url: datos.url || '/' },
    }),
  )
})

// Al tocar el aviso: enfocar la app si está abierta (y llevarla a la obra), o abrirla.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = new URL(evento.notification.data?.url || '/', self.location.origin).href
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (ventanas) => {
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin && 'focus' in v) {
          await v.focus()
          if ('navigate' in v) return v.navigate(destino)
          return
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
