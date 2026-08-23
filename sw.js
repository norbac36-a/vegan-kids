/* Service Worker de "Modo Escenario" (Niños Veganos).

   Objetivo: que la app siga abriendo sin conexión (modo avión, mala cobertura
   en directo...) una vez se ha visitado al menos una vez con conexión.

   Estrategia para la navegación (abrir/recargar la página):
   "network-first con fallback a caché" — si hay conexión, siempre se pide la
   versión más reciente al servidor (y se guarda en caché para la próxima
   vez); si no hay conexión, se sirve la última copia guardada en caché en
   vez de dejar que el navegador muestre su pantalla de error.

   Los demás datos (la sincronización con Firebase, básicamente) NO se
   cachean aquí: solo interceptamos la navegación de la página en sí. */

const CACHE_NAME = 'modo-escenario-v1';
const SHELL_URL = self.registration.scope; // p.ej. https://usuario.github.io/repo/

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(SHELL_URL))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo gestionamos la navegación (cargar/recargar la propia página).
  // Todo lo demás (llamadas a Firebase, etc.) va directo a la red, como si
  // no hubiera Service Worker.
  if(event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(SHELL_URL).then((cached) => cached || Response.error()))
  );
});
