// Fv3.6 · Service worker mínimo (sin next-pwa):
//  - cache-first para /_next/static (inmutable: los nombres llevan hash de build)
//  - network-first para el documento (con fallback a caché para abrir offline)
//  - NADA más: las banderas y cualquier request cross-origin no se tocan ni precachean
const CACHE = 'album26-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // banderas/CDN: fuera
  if (req.mode === 'navigate') {
    // Fv4.0: /login y /auth/* SIEMPRE a red directa — ni se cachean ni se
    // sirven de caché (el estado de sesión no puede quedarse congelado)
    if (url.pathname === '/login' || url.pathname.startsWith('/auth/')) return;
    e.respondWith(
      fetch(req).then((res) => {
        // Safari rechaza servir a una navegación una respuesta redirigida
        // sacada de caché: solo se cachean respuestas 200 sin redirección
        if (res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req)
          .then((hit) => hit || caches.match('/'))
          // nunca responder undefined (Safari lo muestra como error de carga)
          .then((hit) => hit || new Response('Sin conexión — el álbum necesita red para la primera carga.',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
      )
    );
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
