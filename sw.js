// Deixa o app abrir sem internet. Ao publicar uma nova versão, mude VERSAO.
const VERSAO = 'contas-v4';
const ARQUIVOS = [
  './',
  'index.html',
  'nuvem.js',
  'firebase-config.js',
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

  // Fontes do Google e biblioteca do Firebase: usa a guardada e renova em segundo plano.
  // (Login e dados do Firebase passam direto pela rede; o próprio Firebase guarda a cópia offline.)
  const ehSdkFirebase = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || ehSdkFirebase) {
    e.respondWith(
      caches.open(VERSAO + '-fontes').then(c => c.match(req).then(guardada => {
        const rede = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => guardada);
        return guardada || rede;
      }))
    );
    return;
  }

  if (url.origin === location.origin) {
    // Scripts do app: rede primeiro (para receber correções e a configuração do Firebase), cópia sem internet.
    if (url.pathname.endsWith('.js')) {
      e.respondWith(
        fetch(req)
          .then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); return r; })
          .catch(() => caches.match(req))
      );
      return;
    }
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});

// Avisos de vencimento enviados pelo robô diário (avisos/avisos.mjs) pelo Firebase Cloud Messaging.
// O robô manda só "data"; a notificação é montada aqui para funcionar igual no Android e no iPhone.
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { corpo: e.data ? e.data.text() : '' } }; }
  const d = p.data || {};
  const n = p.notification || {};
  const titulo = d.titulo || n.title || 'Contas a Pagar';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.corpo || n.body || 'Você tem contas perto do vencimento.',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: d.tag || 'vencimentos',
    renotify: true,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(janelas => {
      const aberta = janelas.find(j => j.url.startsWith(self.registration.scope));
      if (aberta) return aberta.focus();
      return self.clients.openWindow(destino);
    })
  );
});
