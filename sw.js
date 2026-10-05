// ---------------------------------------------------------------
// Service worker do Fresh Food: guarda o site e o modelo no aparelho
// para tudo funcionar sem internet depois da primeira visita.
//
// Sempre que mudar algum arquivo do site, aumente o número da VERSAO.
// Assim o celular baixa a versão nova e apaga a antiga.
// ---------------------------------------------------------------
const VERSAO = "fresh-food-v2";
const CACHE_SITE = `${VERSAO}-site`;
const CACHE_MODELO = "fresh-food-modelo"; // o modelo não muda, então não depende da versão
const CACHE_FONTES = "fresh-food-fontes";

// Arquivos do próprio site
const ARQUIVOS_SITE = [
	"./",
	"./index.html",
	"./manifest.webmanifest",
	"./Assets/css/stayle.css",
	"./Js/escript.js",
	"./Js/vendor/tf.min.js",
	"./Js/vendor/coco-ssd.min.js",
	"./IMG/logo.png",
	"./IMG/banana.png",
	"./IMG/maca.png",
	"./IMG/laranja.png",
	"./IMG/sem-fruta.png",
	"./IMG/icones/icone-192.png",
	"./IMG/icones/icone-512.png",
];

// Modelo COCO-SSD (o detector que acha a fruta na foto), hospedado pelo Google
const MODELO_JSON = "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json";

// Baixa o model.json e todos os pedaços de pesos que ele lista
async function guardarModelo() {
	const cache = await caches.open(CACHE_MODELO);
	if (await cache.match(MODELO_JSON, { ignoreVary: true })) return;
	const resposta = await fetch(MODELO_JSON);
	if (!resposta.ok) throw new Error("Não foi possível baixar o modelo");
	const json = await resposta.clone().json();
	const base = MODELO_JSON.slice(0, MODELO_JSON.lastIndexOf("/") + 1);
	const pesos = json.weightsManifest.flatMap((grupo) => grupo.paths.map((p) => base + p));
	await cache.addAll(pesos);
	await cache.put(MODELO_JSON, resposta);
}

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_SITE);
			await cache.addAll(ARQUIVOS_SITE);
			// Tenta já guardar o modelo. Se falhar, ele é guardado quando a página carregar.
			try {
				await guardarModelo();
			} catch (erro) {
				console.warn("Modelo será guardado depois", erro);
			}
			await self.skipWaiting();
		})()
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const nomes = await caches.keys();
			await Promise.all(
				nomes
					.filter((nome) => nome.startsWith("fresh-food-v") && nome !== CACHE_SITE)
					.map((nome) => caches.delete(nome))
			);
			await self.clients.claim();
		})()
	);
});

// Primeiro o que está guardado; se não tiver, busca na internet e guarda
async function primeiroCache(request, nomeCache) {
	const cache = await caches.open(nomeCache);
	const guardado = await cache.match(request, { ignoreVary: true });
	if (guardado) return guardado;
	const resposta = await fetch(request);
	if (resposta.ok || resposta.type === "opaque") cache.put(request, resposta.clone());
	return resposta;
}

// Primeiro a internet (para pegar atualizações); sem internet, usa o que está guardado.
// Se a internet estiver muito lenta (mais de 4 segundos), também usa o que está guardado.
async function primeiroRede(request, nomeCache) {
	const cache = await caches.open(nomeCache);
	try {
		const controle = new AbortController();
		const limite = setTimeout(() => controle.abort(), 4000);
		const resposta = await fetch(request, { signal: controle.signal });
		clearTimeout(limite);
		if (resposta.ok) cache.put(request, resposta.clone());
		return resposta;
	} catch (erro) {
		const guardado = await cache.match(request, { ignoreSearch: true });
		if (guardado) return guardado;
		if (request.mode === "navigate") return cache.match("./index.html");
		throw erro;
	}
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);

	if (url.hostname === "storage.googleapis.com" && url.pathname.startsWith("/tfjs-models/")) {
		event.respondWith(primeiroCache(request, CACHE_MODELO));
	} else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
		event.respondWith(primeiroCache(request, CACHE_FONTES));
	} else if (url.origin === self.location.origin) {
		event.respondWith(primeiroRede(request, CACHE_SITE));
	}
});

// A página pergunta se o modelo já está guardado (para mostrar "funciona sem internet")
self.addEventListener("message", (event) => {
	if (event.data === "modelo-pronto?") {
		event.waitUntil(
			(async () => {
				let pronto = false;
				try {
					await guardarModelo();
					pronto = true;
				} catch (erro) {
					pronto = Boolean(await (await caches.open(CACHE_MODELO)).match(MODELO_JSON, { ignoreVary: true }));
				}
				event.source?.postMessage({ tipo: "modelo", pronto });
			})()
		);
	}
});
