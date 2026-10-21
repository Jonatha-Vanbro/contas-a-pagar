// Deixa o app abrir sem internet. Ao publicar uma nova versão, mude VERSAO.
const VERSAO = 'contas-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página: tenta a rede primeiro para receber atualizações; sem internet, usa a cópia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put('index.html', copia)); return r; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Fontes do Google: usa a guardada e renova em segundo plano.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSAO + '-fontes').then(c => c.match(req).then(guardada => {
        const rede = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => guardada);
        return guardada || rede;
      }))
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
