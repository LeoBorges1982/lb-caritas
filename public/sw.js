// LB Cáritas — Service Worker MÍNIMO, só para satisfazer o critério de
// instalabilidade do Chrome/Android (PWA precisa de um service worker
// registrado com um handler de "fetch" para oferecer o prompt "Adicionar à
// tela inicial"). Mesmo padrão do lb-restaurante (ChefCont).
//
// NÃO é um service worker de cache offline sofisticado, e isso é
// DELIBERADO: o LB Cáritas é um sistema de gestão de convênios públicos —
// os dados de negócio (lançamentos, convênios, saldos, prestações de
// contas, alertas) têm que vir SEMPRE da rede, nunca de um cache
// desatualizado. Este SW só faz cache de assets ESTÁTICOS (ícones da
// marca) — nunca de HTML, de rotas da API, nem de nenhuma resposta que
// carregue dado de negócio.
//
// Se o app "funciona offline" hoje, é por acaso (o navegador pode ter o
// documento em memória) — não é uma garantia deste service worker.

const CACHE_NAME = "lb-caritas-static-v1";

// Só os ícones da marca (usados no manifest/splash/instalação). Nada de
// página, script, CSS ou rota de API entra aqui.
const STATIC_ASSETS = [
  "/brand/icon-192.png",
  "/brand/icon-512.png",
  "/brand/icon-maskable-192.png",
  "/brand/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first, SÓ para os ícones estáticos listados acima.
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Tudo o mais (páginas, dados, API, convênios, lançamentos, saldos...) —
  // SEMPRE rede, sem interceptar/cachear. O handler existe só pra registrar
  // o SW; deixar passar direto pro navegador equivale a não ter cache nenhum.
});
