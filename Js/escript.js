const cameraFeed = document.querySelector("#camera-feed");
const detectionCanvas = document.querySelector("#detection-canvas");
const cameraFrame = document.querySelector(".camera-frame");
const cameraLock = document.querySelector("#camera-lock");
const cameraMessage = document.querySelector("#camera-message");
const liveHint = document.querySelector("#live-hint");
const captureButton = document.querySelector("#capture-button");
const galleryButton = document.querySelector("#gallery-button");
const galleryInput = document.querySelector("#gallery-input");
const cameraCard = document.querySelector(".camera-card");
const stepsCard = document.querySelector("#steps-card");
const analyzeButton = document.querySelector("#analyze-button");
const cameraBack = document.querySelector("#camera-back");
const helpButton = document.querySelector("#help-button");
const cameraHelp = document.querySelector("#camera-help");
const cameraHelpClose = document.querySelector("#camera-help-close");
const toast = document.querySelector("#toast");
const detectionResult = document.querySelector("#detection-result");
const verdict = document.querySelector("#verdict");
const verdictFruit = document.querySelector("#verdict-fruit");
const verdictTitle = document.querySelector("#verdict-title");
const verdictTip = document.querySelector("#verdict-tip");

// ---------------------------------------------------------------
// "Por quê?": motivos simples, a partir das medidas que mais pesaram
// ---------------------------------------------------------------
const pctTexto = (x) => `${Math.round(x * 100)}%`;
// Chance mostrada para a pessoa: entre 1% e 99% (o modelo nunca tem certeza absoluta)
const chanceMostrada = (x) => Math.min(99, Math.max(1, Math.round(x * 100)));

// Frase de cada medida. "bom" = puxou para fresco, "ruim" = empurrou para passado.
function fraseMotivo(k, lado, f, z) {
	const v = f[k];
	switch (k) {
		case 0: return lado === "bom"
			? (v >= 0.6 ? `A casca está com a cor viva em quase toda a fruta (${pctTexto(v)})` : `Boa parte da casca está com a cor viva (${pctTexto(v)})`)
			: `Pouca casca com a cor viva da fruta (${pctTexto(v)})`;
		case 1: return lado === "bom"
			? (v < 0.03 ? "Não apareceram manchas marrons" : `Poucas manchas marrons (${pctTexto(v)} da casca)`)
			: `Manchas marrons em ${pctTexto(v)} da casca`;
		case 2: return lado === "bom"
			? (v < 0.03 ? "Nenhum sinal de mofo" : `Quase nada acinzentado ou esbranquiçado (${pctTexto(v)})`)
			: `Partes acinzentadas ou esbranquiçadas (${pctTexto(v)}), que podem ser mofo`;
		case 3: return lado === "bom"
			? "Sem partes muito escuras na casca"
			: `Partes muito escuras na casca (${pctTexto(v)})`;
		case 4: return lado === "bom"
			? "A cor da casca não está apagada"
			: `A cor está mais apagada que o normal em ${pctTexto(v)} da casca`;
		case 5: return lado === "bom"
			? "A cor está intensa, como numa fruta fresca"
			: "A cor perdeu intensidade";
		case 6: return lado === "bom"
			? "O brilho da casca está dentro do normal"
			: (z < 0 ? "A casca está mais escura que o normal" : "A casca está mais clara e desbotada que o normal");
		case 7: return lado === "bom"
			? "A casca está lisa"
			: "A casca está enrugada ou irregular";
		default: return "";
	}
}

function buildWhy(freshness) {
	const m = MODELO[freshness.fruitKey];
	const itens = freshness.features.map((f, k) => {
		const z = (f - m.media[k]) / m.desvio[k];
		return { k, z, valor: m.pesos[k] * z };
	});
	const bons = itens.filter((i) => i.valor < -0.15).sort((a, b) => a.valor - b.valor);
	const ruins = itens.filter((i) => i.valor > 0.15).sort((a, b) => b.valor - a.valor);
	const estado = freshness.state.className;

	let escolhidos;
	if (estado === "fresco") escolhidos = bons.slice(0, 3).map((i) => ({ ...i, lado: "bom" }));
	else if (estado === "passado") escolhidos = ruins.slice(0, 3).map((i) => ({ ...i, lado: "ruim" }));
	else escolhidos = [...ruins.slice(0, 2).map((i) => ({ ...i, lado: "ruim" })), ...bons.slice(0, 1).map((i) => ({ ...i, lado: "bom" }))];

	return escolhidos.map((i) => ({ lado: i.lado, texto: fraseMotivo(i.k, i.lado, freshness.features, i.z) }));
}

function fillVerdictWhy(freshness) {
	const lista = document.querySelector("#verdict-why-list");
	if (!lista) return;
	const motivos = buildWhy(freshness);
	lista.innerHTML = "";
	motivos.forEach(({ lado, texto }) => {
		const item = document.createElement("li");
		item.className = lado === "bom" ? "why-bom" : "why-ruim";
		item.innerHTML = `<span class="why-icon" aria-hidden="true">${lado === "bom" ? "✓" : "!"}</span><span></span>`;
		item.lastElementChild.textContent = texto;
		lista.appendChild(item);
	});
	lista.parentElement.hidden = motivos.length === 0;
}

// Resposta do passo 3 ("Pode consumir?") para cada estado
const VEREDITOS = {
	fresco: "Pode consumir",
	moderado: "Consuma logo",
	passado: "Melhor não consumir",
};
const stepsGallery = document.querySelector("#steps-gallery");
const photoResult = document.querySelector("#photo-result");
const resultCard = document.querySelector("#result-card");
const downloadButton = document.querySelector("#download-button");
const shareButton = document.querySelector("#share-button");
const newPhotoButton = document.querySelector("#new-photo-button");
const fruitOptions = document.querySelectorAll(".fruit-option");
const detectedFruit = document.querySelector("#detected-fruit");
const freshnessStatus = document.querySelector("#freshness-status");
const freshnessReason = document.querySelector("#freshness-reason");
const confidenceValue = document.querySelector("#confidence-value");
const confidenceBar = document.querySelector("#confidence-bar");
const confidenceTrack = document.querySelector(".confidence-track");

const fruitNames = {
	apple: "Maçã",
	banana: "Banana",
	orange: "Laranja",
};


// Recomendação de uso para cada fruta e cada estado
const statusStates = {
	fresco: {
		label: "Fresco",
		className: "fresco",
		tips: {
			banana: "Boa para comer ao natural nos próximos dias.",
			apple: "Boa para comer ao natural. Dura mais se ficar na geladeira.",
			orange: "Ótima para suco ou para comer ao natural.",
		},
	},
	moderado: {
		label: "Moderado",
		className: "moderado",
		tips: {
			banana: "Consuma logo. Ótima para vitamina, bolo ou panqueca.",
			apple: "Consuma logo. Boa para doce, torta ou compota.",
			orange: "Consuma logo, de preferência em suco.",
		},
	},
	passado: {
		label: "Passado",
		className: "passado",
		tips: {
			banana: "Evite consumir. Descarte se tiver mofo ou cheiro ruim.",
			apple: "Evite consumir. Descarte se tiver partes moles ou mofo.",
			orange: "Evite consumir. Descarte se tiver mofo ou cheiro azedo.",
		},
	},
};

// ---------------------------------------------------------------
// Análise de frescor
// 1) Pega só a fruta: a caixa do COCO-SSD é reduzida para 160x160 e
//    usamos uma área oval no centro (os cantos costumam ser fundo).
// 2) Mede 8 características da casca: cor viva, manchas marrons, mofo
//    (partes acinzentadas/esbranquiçadas), partes escuras, cor apagada,
//    saturação média, brilho médio e textura (casca lisa ou enrugada).
// 3) Um classificador de regressão logística (um por fruta) transforma
//    essas medidas na chance de a fruta estar estragada.
// Treinado com o dataset "Fruits fresh and rotten for classification"
// (Kaggle). Separando por foto original, acertou 94,7% em 570 fotos
// que não foram usadas no treino (antes: 80% com a fórmula antiga).
// O script de treino está em Docs/treino/.
// ---------------------------------------------------------------

// Faixas de "cor viva" de cada fruta (matiz em graus, saturação e brilho mínimos)
const CORES_VIVAS = {
	banana: { hue: [[35, 100]], satMin: 0.35, valMin: 0.35 },
	orange: { hue: [[20, 45]], satMin: 0.4, valMin: 0.35 },
	apple: { hue: [[0, 15], [345, 360], [70, 130]], satMin: 0.35, valMin: 0.35 },
};

// Números do classificador (gerados por Docs/treino/treinar.py, versão 2: com o fundo separado)
// Ordem: corViva, marrom, mofo, escuro, apagado, saturacao, brilho, textura
const MODELO = {
	banana: {
		media: [0.437746, 0.208528, 0.163626, 0.041358, 0.148742, 0.436198, 0.672188, 0.056682],
		desvio: [0.391097, 0.244778, 0.175835, 0.07746, 0.154735, 0.147461, 0.22767, 0.03263],
		pesos: [-2.1624, 2.4826, 1.1083, 0.032, 0.2628, -0.09, -1.8772, 2.1762],
		base: 2.0155,
	},
	apple: {
		media: [0.430518, 0.068665, 0.04997, 0.004744, 0.446103, 0.563388, 0.730597, 0.036467],
		desvio: [0.337744, 0.106234, 0.047838, 0.024631, 0.317424, 0.089288, 0.104287, 0.014694],
		pesos: [-1.3971, 2.888, -0.2192, -0.2503, 0.5724, 0.0164, 1.6987, 2.9436],
		base: 1.19,
	},
	orange: {
		media: [0.613575, 0.025955, 0.132276, 0.003792, 0.224402, 0.577966, 0.830737, 0.030087],
		desvio: [0.287084, 0.058406, 0.173252, 0.010181, 0.190034, 0.147593, 0.106795, 0.018219],
		pesos: [-0.5629, 0.747, 1.254, -0.1576, -0.5141, -1.2574, -0.2005, 0.941],
		base: 1.0561,
	},
};

// Detecção de foto fora do padrão (versão simples da "detecção de anomalia" do FreshNet).
// Mede a distância de Mahalanobis entre as 8 medidas da foto e as fotos de calibração.
// Se passar do limite, a foto é diferente do que o sistema aprendeu e o resultado merece desconfiança.
// O limite deixa passar 97,5% das fotos normais. Gerado por Docs/treino/avaliar_metricas.py
const ANOMALIA = {
	banana: {
		limite: 4.247,
		inversa: [
			[12.79674, 5.60374, 3.86544, 1.13469, 4.38121, -1.44667, -2.37672, 0.37764],
			[5.60374, 6.57835, 3.16758, 2.1691, 2.38297, -0.01949, 3.25971, -0.09361],
			[3.86544, 3.16758, 4.64513, 1.59445, 1.86966, 2.61488, 0.47809, -0.29695],
			[1.13469, 2.1691, 1.59445, 2.46776, 0.66542, 1.25332, 2.11181, 0.02819],
			[4.38121, 2.38297, 1.86966, 0.66542, 2.699, 0.08847, -0.74983, -0.48307],
			[-1.44667, -0.01949, 2.61488, 1.25332, 0.08847, 4.90991, -0.49941, -0.48818],
			[-2.37672, 3.25971, 0.47809, 2.11181, -0.74983, -0.49941, 8.21959, 1.42687],
			[0.37764, -0.09361, -0.29695, 0.02819, -0.48307, -0.48818, 1.42687, 2.31662],
		],
	},
	apple: {
		limite: 5.458,
		inversa: [
			[10.2806, 3.15279, 1.22637, 0.74255, 9.04399, -0.24203, 0.23604, 0.16398],
			[3.15279, 2.73284, 0.41614, 0.21737, 2.34469, 0.11336, 1.21911, -0.21265],
			[1.22637, 0.41614, 1.98769, 0.08604, 1.26375, 1.12282, 0.34866, -0.19231],
			[0.74255, 0.21737, 0.08604, 1.24191, 0.57976, 0.35316, 0.33186, -0.05608],
			[9.04399, 2.34469, 1.26375, 0.57976, 9.35691, 0.02296, -0.73745, -0.06998],
			[-0.24203, 0.11336, 1.12282, 0.35316, 0.02296, 1.84605, 0.22287, -0.17337],
			[0.23604, 1.21911, 0.34866, 0.33186, -0.73745, 0.22287, 2.36007, 0.33576],
			[0.16398, -0.21265, -0.19231, -0.05608, -0.06998, -0.17337, 0.33576, 1.2329],
		],
	},
	orange: {
		limite: 5.879,
		inversa: [
			[11.82392, 1.93558, 5.21144, 0.12709, 6.99868, -1.69383, -0.52663, 0.13462],
			[1.93558, 2.21301, 1.20811, 0.11243, 1.43521, -0.46463, 0.93956, -0.70967],
			[5.21144, 1.20811, 6.65025, 0.57368, 3.89588, 3.07835, 0.52283, 0.22345],
			[0.12709, 0.11243, 0.57368, 1.22105, 0.2565, 0.35783, 0.69663, 0.08378],
			[6.99868, 1.43521, 3.89588, 0.2565, 5.42044, -0.12401, -0.00717, -0.19347],
			[-1.69383, -0.46463, 3.07835, 0.35783, -0.12401, 5.19693, -0.01252, 0.67902],
			[-0.52663, 0.93956, 0.52283, 0.69663, -0.00717, -0.01252, 3.04264, 0.93211],
			[0.13462, -0.70967, 0.22345, 0.08378, -0.19347, 0.67902, 0.93211, 2.41311],
		],
	},
};

// Maçã ou laranja pela cor (Docs/treino/treinar_cor.py). Não troca a fruta sozinho:
// só avisa quando a cor discorda do detector com 90% ou mais (aviso indevido em 3% das fotos).
// Medidas: 12 faixas de matiz (30 graus cada), parte sem cor, saturação média, brilho médio.
const COR_FRUTA = {
	media: [0.512689, 0.242708, 0.084836, 0.005743, 0.000262, 0.000575, 0.000896, 0.000731, 4.6e-05, 3.3e-05, 0.000171, 0.054719, 0.096593, 0.570353, 0.778445],
	desvio: [0.306384, 0.269078, 0.235835, 0.021685, 0.00235, 0.005962, 0.007577, 0.007554, 0.000361, 0.000212, 0.001141, 0.157468, 0.137015, 0.120933, 0.116751],
	pesos: [0.2084, 0.0561, -0.3544, 0.1795, 0.5945, 0.1483, 0.8816, -0.2928, 0.3438, -0.596, -0.369, -3.312, 3.7656, 1.7072, 1.3533],
	base: -0.6416,
};
const COR_FRUTA_AVISO = 0.9;

// Nitidez mínima (variância do Laplaciano numa versão 256x256 da fruta).
// Calibrado no dataset: marca 2,6% das fotos nítidas e 57% das fotos levemente borradas.
const LADO_NITIDEZ = 256;
const LIMITE_NITIDEZ = 12;

// Textura a partir da qual a casca é considerada irregular (meio-termo entre fresca e estragada)
const TEXTURA_IRREGULAR = { banana: 0.055, apple: 0.036, orange: 0.030 };

// Chance de estar estragada: abaixo de 40% = Fresco, acima de 70% = Passado
const CENTROS_ESTADO = { fresco: 0.25, moderado: 0.55, passado: 0.85 };
// Tamanho da imagem analisada (igual ao usado no treino)
const LADO_ANALISE = 160;
// Tamanho da área oval em relação à caixa
const OVAL = 0.9;
// Maior lado da foto analisada (fotos de celular são enormes e deixariam tudo lento)
const MAX_PHOTO_SIDE = 1280;
// Quantas leituras sem achar a fruta antes de limpar o resultado
const MAX_MISSES = 3;
// Limites de luz: abaixo ou acima disso o resultado não é confiável
const LIGHT_MIN = 0.22;
const LIGHT_MAX = 0.88;
// Categorias de cada ponto da casca, com a cor usada no mapa e na barra
const CATEGORIAS = [
	{ key: "viva", nome: "Cor viva (casca saudável)", cor: null }, // usa a cor da fruta (abaixo)
	{ key: "apagado", nome: "Cor apagada", cor: [214, 196, 146] },
	{ key: "marrom", nome: "Manchas marrons", cor: [140, 86, 42] },
	{ key: "mofo", nome: "Acinzentado ou esbranquiçado (mofo)", cor: [168, 176, 186] },
	{ key: "escuro", nome: "Partes muito escuras", cor: [40, 32, 28] },
];
// Cor viva de cada fruta no mapa, para o mapa lembrar a fruta de verdade
const COR_VIVA_FRUTA = { banana: [236, 196, 48], apple: [196, 52, 44], orange: [236, 132, 30] };
const corCategoria = (cat, fruitKey) => cat.cor ?? COR_VIVA_FRUTA[fruitKey];
const CATEGORIA_INDICE = Object.fromEntries(CATEGORIAS.map((c, i) => [c.key, i]));

// Nome de cada uma das 8 medidas, na ordem do classificador
const NOMES_MEDIDAS = [
	"Cor viva",
	"Manchas marrons",
	"Partes acinzentadas (mofo)",
	"Partes muito escuras",
	"Cor apagada",
	"Intensidade da cor",
	"Brilho da casca",
	"Textura da casca",
];

// Cor usada para pintar os defeitos por cima da imagem (RGBA)
const SPOT_COLOR = [255, 64, 64, 115];

const explainPanel = document.querySelector("#explain-panel");
const explainCrop = document.querySelector("#explain-crop");
const explainMap = document.querySelector("#explain-map");
const explainStack = document.querySelector("#explain-stack");
const explainLegend = document.querySelector("#explain-legend");
const explainChance = document.querySelector("#explain-chance");
const explainFactors = document.querySelector("#explain-factors");
const scaleMarker = document.querySelector("#scale-marker");
const explainChecks = document.querySelector("#explain-checks");
const resultWarnings = document.querySelector("#result-warnings");
const resultScaleMarker = document.querySelector("#result-scale-marker");

// Canvas escondido que guarda a foto analisada (da câmera ou da galeria)
const photoCanvas = document.createElement("canvas");
const photoContext = photoCanvas.getContext("2d", { willReadFrequently: true });

let detector;
let selectedMode = null; // "auto", "banana", "apple" ou "orange"
let cameraStarted = false;
let detectionInProgress = false;
let detectionLoopStarted = false;
let showingResult = false;
let missCount = 0;
let lastCardBlob = null;
let lastCardName = "fresh-food.png";

function inHueRanges(h, ranges) {
	return ranges.some(([lo, hi]) => h >= lo && h <= hi);
}

function rgbToHsv(r, g, b) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	const s = max === 0 ? 0 : d / max;
	return [h, s, max];
}

// Canvas pequeno onde a fruta é reduzida para 160x160 antes da análise
const analysisCanvas = document.createElement("canvas");
analysisCanvas.width = LADO_ANALISE;
analysisCanvas.height = LADO_ANALISE;
const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });

// Reduz a região da fruta para 160x160 em etapas (metade por vez),
// para ficar parecido com a redução feita no treino
function shrinkRegion(bbox) {
	const [x, y, w, h] = bbox.map(Math.round);
	let source = photoCanvas;
	let sx = Math.max(0, x);
	let sy = Math.max(0, y);
	let sw = Math.max(1, Math.min(photoCanvas.width - sx, w));
	let sh = Math.max(1, Math.min(photoCanvas.height - sy, h));

	while (sw > LADO_ANALISE * 2 && sh > LADO_ANALISE * 2) {
		const step = document.createElement("canvas");
		step.width = Math.round(sw / 2);
		step.height = Math.round(sh / 2);
		const stepContext = step.getContext("2d");
		stepContext.imageSmoothingQuality = "high";
		stepContext.drawImage(source, sx, sy, sw, sh, 0, 0, step.width, step.height);
		source = step;
		sx = 0;
		sy = 0;
		sw = step.width;
		sh = step.height;
	}

	analysisContext.imageSmoothingQuality = "high";
	analysisContext.clearRect(0, 0, LADO_ANALISE, LADO_ANALISE);
	analysisContext.drawImage(source, sx, sy, sw, sh, 0, 0, LADO_ANALISE, LADO_ANALISE);
	return analysisContext.getImageData(0, 0, LADO_ANALISE, LADO_ANALISE);
}

// ---------------------------------------------------------------
// Separar o fundo (versão 2 do modelo)
// A caixa do detector é um retângulo, então os cantos quase sempre são fundo.
// 1) Pega as cores dos cantos e resume em até 3 cores (k-means).
// 2) Marca como fundo os pontos parecidos com essas cores LIGADOS à borda.
//    Uma mancha escura no meio da fruta não está ligada à borda, então continua contando.
// Mesma conta de Docs/treino/caracteristicas.py.
// ---------------------------------------------------------------
const K_FUNDO = 3;
const LIMITE_COR_FUNDO = 0.13; // distância de cor (RGB de 0 a 1)
const FUNDO_MAX = 0.6; // se o fundo cobrir mais de 60% do oval, algo deu errado: não remove nada

function separarFundo(data) {
	const N = LADO_ANALISE;
	const c = (N - 1) / 2;
	const fundo = new Uint8Array(N * N);

	// Pontos dos cantos (fora do círculo que cabe na caixa), um sim e um não
	const cantos = [];
	let alterna = 0;
	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			if ((x - c) ** 2 + (y - c) ** 2 <= (N / 2) ** 2) continue;
			if (alterna++ % 2) continue;
			const i = (y * N + x) * 4;
			cantos.push([data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]);
		}
	}

	// k-means com começo fixo (pontos em ordem de brilho), igual ao Python
	const ordem = cantos.map((p, i) => [p[0] + p[1] + p[2], i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	const centros = [];
	for (let j = 0; j < K_FUNDO; j++) centros.push([...cantos[ordem[Math.floor(((j + 0.5) / K_FUNDO) * cantos.length)][1]]]);
	const rotulo = new Uint8Array(cantos.length);
	const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
	const rotular = () => {
		cantos.forEach((p, i) => {
			let melhor = 0;
			for (let j = 1; j < K_FUNDO; j++) if (dist2(p, centros[j]) < dist2(p, centros[melhor])) melhor = j;
			rotulo[i] = melhor;
		});
	};
	for (let it = 0; it < 8; it++) {
		rotular();
		const soma = centros.map(() => [0, 0, 0, 0]);
		cantos.forEach((p, i) => {
			const s = soma[rotulo[i]];
			s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
		});
		soma.forEach((s, j) => {
			if (s[3]) centros[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
		});
	}
	rotular();
	const tamanho = new Array(K_FUNDO).fill(0);
	rotulo.forEach((r) => tamanho[r]++);
	// Cores que quase não aparecem nos cantos (menos de 10%) não contam
	const cores = centros.filter((_, j) => tamanho[j] >= 0.1 * cantos.length);
	if (!cores.length) return fundo;

	// Pontos parecidos com alguma cor do fundo
	const limite2 = LIMITE_COR_FUNDO ** 2;
	const parecido = new Uint8Array(N * N);
	for (let i = 0; i < N * N; i++) {
		const p = [data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255];
		if (cores.some((q) => dist2(p, q) < limite2)) parecido[i] = 1;
	}

	// Espalha a partir dos pontos parecidos que ficam fora do oval (vizinhos de 4 lados)
	const fila = [];
	const rOval = (N / 2) * OVAL;
	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			const i = y * N + x;
			if (parecido[i] && (x - c) ** 2 + (y - c) ** 2 > rOval * rOval) {
				fundo[i] = 1;
				fila.push(i);
			}
		}
	}
	while (fila.length) {
		const i = fila.pop();
		const x = i % N;
		const vizinhos = [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N];
		for (const j of vizinhos) {
			if (j < 0 || j >= N * N || fundo[j] || !parecido[j]) continue;
			fundo[j] = 1;
			fila.push(j);
		}
	}

	// Se o "fundo" cobrir a maior parte do oval, é melhor não remover nada
	let noOval = 0;
	let oval = 0;
	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			if ((x - c) ** 2 + (y - c) ** 2 > rOval * rOval) continue;
			oval++;
			if (fundo[y * N + x]) noOval++;
		}
	}
	if (noOval > FUNDO_MAX * oval) fundo.fill(0);
	return fundo;
}

// Mede as 8 características da casca dentro da área oval (sem o fundo)
// e devolve também uma máscara com os defeitos (para desenhar na foto)
function measureFruit(imageData, fruitKey) {
	const cor = CORES_VIVAS[fruitKey];
	const N = LADO_ANALISE;
	const data = imageData.data;
	const hue = new Float32Array(N * N);
	const sat = new Float32Array(N * N);
	const val = new Float32Array(N * N);
	for (let i = 0; i < N * N; i++) {
		const [h, s, v] = rgbToHsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
		hue[i] = h;
		sat[i] = s;
		val[i] = v;
	}

	const fundo = separarFundo(data);
	const c = (N - 1) / 2;
	const r = (N / 2) * OVAL;
	let rawValSum = 0;
	let rawCount = 0;

	// Pontos que entram na conta: dentro do oval, sem fundo, sem branco de reflexo e sem preto
	const conta = new Uint8Array(N * N);
	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			if ((x - c) ** 2 + (y - c) ** 2 > r * r) continue;
			const i = y * N + x;
			rawValSum += val[i];
			rawCount++;
			if (fundo[i]) continue;
			if ((val[i] > 0.93 && sat[i] < 0.08) || val[i] < 0.06) continue;
			conta[i] = 1;
		}
	}

	const mask = new ImageData(N, N);
	// Mapa de categorias: 255 = ponto fora da conta (fundo, reflexo ou fora do oval)
	const categoryMap = new Uint8Array(N * N).fill(255);
	const count = { viva: 0, marrom: 0, mofo: 0, escuro: 0, apagado: 0 };
	const faixasCor = new Array(12).fill(0);
	let semCor = 0;
	let n = 0;
	let satSum = 0;
	let valSum = 0;
	let texSum = 0;

	for (let i = 0; i < N * N; i++) {
		if (!conta[i]) continue;
		const x = i % N;
		const h = hue[i];
		const s = sat[i];
		const v = val[i];
		n++;
		satSum += s;
		valSum += v;
		// Textura: diferença de brilho para o vizinho da direita e o de baixo (só pontos da fruta)
		if (x < N - 1 && conta[i + 1]) texSum += Math.abs(val[i + 1] - v);
		if (i + N < N * N && conta[i + N]) texSum += Math.abs(val[i + N] - v);
		// Cor para o teste "maçã ou laranja"
		if (s >= 0.2 && v >= 0.2) faixasCor[Math.min(11, Math.floor(h / 30))]++;
		else semCor++;

		const isViva = inHueRanges(h, cor.hue) && s > cor.satMin && v > cor.valMin;
		let categoria;
		if (isViva) categoria = "viva";
		else if (inHueRanges(h, [[0, 50], [340, 360]]) && s >= 0.2 && v < 0.55) categoria = "marrom";
		else if (s < 0.2 && v >= 0.3) categoria = "mofo";
		else if (v < 0.25) categoria = "escuro";
		else categoria = "apagado";
		count[categoria]++;
		categoryMap[i] = CATEGORIA_INDICE[categoria];
		const defeito = categoria === "marrom" || categoria === "mofo" || categoria === "escuro";

		if (defeito) {
			mask.data[i * 4] = SPOT_COLOR[0];
			mask.data[i * 4 + 1] = SPOT_COLOR[1];
			mask.data[i * 4 + 2] = SPOT_COLOR[2];
			mask.data[i * 4 + 3] = SPOT_COLOR[3];
		}
	}

	const total = Math.max(1, n);
	return {
		features: [
			count.viva / total,
			count.marrom / total,
			count.mofo / total,
			count.escuro / total,
			count.apagado / total,
			n ? satSum / n : 0,
			n ? valSum / n : 0,
			n ? texSum / n : 0,
		],
		corFruta: [...faixasCor.map((q) => q / total), semCor / total, n ? satSum / n : 0, n ? valSum / n : 0],
		brightness: rawCount ? rawValSum / rawCount : 0,
		mask,
		categoryMap,
		counts: count,
	};
}

// Chance (0 a 1) de a fruta ser laranja, só pela cor da casca
function chanceLaranjaPelaCor(medidas) {
	let z = COR_FRUTA.base;
	medidas.forEach((f, k) => {
		z += COR_FRUTA.pesos[k] * ((f - COR_FRUTA.media[k]) / COR_FRUTA.desvio[k]);
	});
	return 1 / (1 + Math.exp(-z));
}

// Regressão logística: transforma as medidas na chance (0 a 1) de estar estragada
function rottenChance(features, fruitKey) {
	const m = MODELO[fruitKey];
	let z = m.base;
	features.forEach((f, k) => {
		z += m.pesos[k] * ((f - m.media[k]) / m.desvio[k]);
	});
	return 1 / (1 + Math.exp(-z));
}

// Transforma a chance de estar estragada nas três barras (somam 100%)
// e escolhe o estado. Os limites ficam em 40% e 70%.
function freshnessFromChance(chance) {
	const peso = {};
	let soma = 0;
	Object.entries(CENTROS_ESTADO).forEach(([key, centro]) => {
		peso[key] = Math.exp(-((chance - centro) ** 2) / (2 * 0.12 ** 2));
		soma += peso[key];
	});
	const avg = {};
	Object.keys(peso).forEach((key) => {
		avg[key] = (peso[key] / soma) * 100;
	});

	const key = chance < 0.4 ? "fresco" : chance > 0.7 ? "passado" : "moderado";
	return { key, state: statusStates[key], percent: Math.round(avg[key]), avg, chance };
}

// Canvas para medir a nitidez (foto tremida ou desfocada)
const sharpCanvas = document.createElement("canvas");
sharpCanvas.width = LADO_NITIDEZ;
sharpCanvas.height = LADO_NITIDEZ;
const sharpContext = sharpCanvas.getContext("2d", { willReadFrequently: true });

// Nitidez: aplica o filtro Laplaciano (realça bordas) e mede a variação.
// Foto borrada quase não tem bordas, então a variação fica baixa.
function measureSharpness(bbox) {
	const N = LADO_NITIDEZ;
	const [x, y, w, h] = bbox;
	sharpContext.imageSmoothingQuality = "high";
	sharpContext.drawImage(photoCanvas, x, y, w, h, 0, 0, N, N);
	const data = sharpContext.getImageData(0, 0, N, N).data;
	const gray = new Float32Array(N * N);
	for (let i = 0; i < N * N; i++) {
		gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
	}
	const c = (N - 1) / 2;
	const r = (N / 2) * OVAL;
	let n = 0;
	let sum = 0;
	let sumSq = 0;
	for (let yy = 1; yy < N - 1; yy++) {
		for (let xx = 1; xx < N - 1; xx++) {
			if ((xx - c) ** 2 + (yy - c) ** 2 > r * r) continue;
			const i = yy * N + xx;
			if (gray[i] > 237) continue; // fundo branco não conta
			const lap = gray[i - 1] + gray[i + 1] + gray[i - N] + gray[i + N] - 4 * gray[i];
			n++;
			sum += lap;
			sumSq += lap * lap;
		}
	}
	if (n < 100) return 0;
	const mean = sum / n;
	return sumSq / n - mean * mean;
}

// Distância entre as medidas da foto e o "normal" do treino
function outlierDistance(features, fruitKey) {
	const m = MODELO[fruitKey];
	const z = features.map((f, k) => (f - m.media[k]) / m.desvio[k]);
	const inv = ANOMALIA[fruitKey].inversa;
	let d = 0;
	for (let i = 0; i < 8; i++) {
		for (let j = 0; j < 8; j++) d += z[i] * inv[i][j] * z[j];
	}
	return Math.sqrt(Math.max(0, d));
}

// Analisa a fruta dentro da caixa encontrada pelo COCO-SSD
function analyzeFruit(fruitKey, bbox) {
	const crop = shrinkRegion(bbox);
	const measured = measureFruit(crop, fruitKey);
	const chance = rottenChance(measured.features, fruitKey);
	const freshness = freshnessFromChance(chance);
	freshness.features = measured.features;
	freshness.fruitKey = fruitKey;
	freshness.avg.brightness = measured.brightness;
	freshness.crop = crop;
	freshness.sharpness = measureSharpness(bbox);
	freshness.outlier = outlierDistance(measured.features, fruitKey);
	freshness.outlierLimit = ANOMALIA[fruitKey].limite;
	freshness.categoryMap = measured.categoryMap;
	freshness.counts = measured.counts;
	freshness.corFruta = measured.corFruta;
	return { freshness, mask: measured.mask };
}

// Explica em linguagem simples por que o sistema chegou no resultado
function buildReason(freshness) {
	const [viva, marrom, mofo, escuro, , , , textura] = freshness.features;
	const pct = (x) => Math.round(x * 100);
	const partes = [`${pct(viva)}% da casca com cor viva`];
	partes.push(`${pct(marrom + escuro)}% com manchas escuras`);
	partes.push(`${pct(mofo)}% acinzentada ou esbranquiçada`);
	const casca = textura > TEXTURA_IRREGULAR[freshness.fruitKey] ? "casca irregular" : "casca lisa";
	return `${partes.join(", ")} e ${casca}.`;
}

function sharpnessMessage(sharpness) {
	if (sharpness < LIMITE_NITIDEZ) return "Atenção: a foto parece tremida ou fora de foco. Tire de novo com a câmera parada.";
	return null;
}

function outlierMessage(freshness) {
	if (freshness.outlier > freshness.outlierLimit) {
		return "Atenção: esta foto é bem diferente das que o sistema aprendeu (fundo, luz, ângulo ou outra fruta). O resultado pode não ser confiável.";
	}
	return null;
}

function lightMessage(brightness) {
	if (brightness < LIGHT_MIN) return "Atenção: pouca luz na foto, o resultado pode não ser confiável.";
	if (brightness > LIGHT_MAX) return "Atenção: luz forte demais na foto, o resultado pode não ser confiável.";
	return null;
}

// ---------------------------------------------------------------
// Painel "Por que deu esse resultado"
// ---------------------------------------------------------------

// Avisos que aparecem junto do resultado
function showWarnings(list) {
	if (!resultWarnings) return;
	resultWarnings.innerHTML = "";
	list.forEach((text) => {
		const item = document.createElement("li");
		item.textContent = text;
		resultWarnings.appendChild(item);
	});
	resultWarnings.hidden = list.length === 0;
}

// Bloco "Confiabilidade da foto": nitidez, padrão, luz e tempo
function fillChecks(freshness) {
	if (!explainChecks) return;
	const fmt = (n) => Math.round(n).toLocaleString("pt-BR");
	const dec = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	const brilho = freshness.avg.brightness;
	const luzOk = brilho >= LIGHT_MIN && brilho <= LIGHT_MAX;
	const checks = [
		{
			ok: freshness.sharpness >= LIMITE_NITIDEZ,
			titulo: "Nitidez",
			texto: freshness.sharpness >= LIMITE_NITIDEZ
				? `Foto nítida (${fmt(freshness.sharpness)}, mínimo ${LIMITE_NITIDEZ}).`
				: `Foto tremida ou fora de foco (${fmt(freshness.sharpness)}, mínimo ${LIMITE_NITIDEZ}).`,
		},
		{
			ok: freshness.outlier <= freshness.outlierLimit,
			titulo: "Parecida com o treino",
			texto: freshness.outlier <= freshness.outlierLimit
				? `Dentro do que o sistema aprendeu (distância ${dec(freshness.outlier)}, limite ${dec(freshness.outlierLimit)}).`
				: `Fora do padrão (distância ${dec(freshness.outlier)}, limite ${dec(freshness.outlierLimit)}).`,
		},
		{
			ok: luzOk,
			titulo: "Iluminação",
			texto: luzOk ? `Luz adequada (${Math.round(brilho * 100)}%).` : `Luz ${brilho < LIGHT_MIN ? "fraca" : "forte demais"} (${Math.round(brilho * 100)}%).`,
		},
	];
	explainChecks.innerHTML = "";
	checks.forEach(({ ok, titulo, texto }) => {
		const item = document.createElement("li");
		item.className = ok ? "check-ok" : "check-alerta";
		item.innerHTML = `<span class="check-icon" aria-hidden="true">${ok ? "✓" : "!"}</span><span><strong>${titulo}</strong> ${texto}</span>`;
		explainChecks.appendChild(item);
	});

	if (freshness.timing) {
		const { deteccao, analise } = freshness.timing;
		const item = document.createElement("li");
		item.className = "check-tempo";
		item.innerHTML = `<span class="check-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.5M10 3h4"/></svg></span><span><strong>Tempo</strong> ${fmt(deteccao + analise)} ms (achar a fruta ${fmt(deteccao)} ms + analisar ${fmt(analise)} ms).</span>`;
		explainChecks.appendChild(item);
	}
}

// Quanto cada medida empurrou a decisão (é a conta da regressão logística, parte por parte)
function contributions(freshness) {
	const m = MODELO[freshness.fruitKey];
	return freshness.features.map((f, k) => ({
		nome: NOMES_MEDIDAS[k],
		valor: m.pesos[k] * ((f - m.media[k]) / m.desvio[k]),
	}));
}

function drawExplainImages(freshness) {
	const N = LADO_ANALISE;
	const c = (N - 1) / 2;
	const r = (N / 2) * OVAL;

	// Recorte: fora do oval fica apagado, para mostrar a área que conta
	const crop = new ImageData(new Uint8ClampedArray(freshness.crop.data), N, N);
	const map = new ImageData(N, N);
	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			const i = y * N + x;
			const fora = (x - c) ** 2 + (y - c) ** 2 > r * r;
			if (fora) crop.data[i * 4 + 3] = 70;
			const cat = freshness.categoryMap[i];
			if (cat === 255) continue;
			const [cr, cg, cb] = corCategoria(CATEGORIAS[cat], freshness.fruitKey);
			map.data[i * 4] = cr;
			map.data[i * 4 + 1] = cg;
			map.data[i * 4 + 2] = cb;
			map.data[i * 4 + 3] = 255;
		}
	}
	explainCrop.getContext("2d").putImageData(crop, 0, 0);
	explainMap.getContext("2d").putImageData(map, 0, 0);
}

function fillExplain(freshness) {
	if (!explainPanel || !freshness.crop) return;
	drawExplainImages(freshness);
	fillChecks(freshness);

	// Barra empilhada e legenda com a porcentagem de cada categoria
	const total = Math.max(1, Object.values(freshness.counts).reduce((a, b) => a + b, 0));
	explainStack.innerHTML = "";
	explainLegend.innerHTML = "";
	CATEGORIAS.forEach((cat) => {
		const { key, nome } = cat;
		const pct = (freshness.counts[key] / total) * 100;
		const rgb = `rgb(${corCategoria(cat, freshness.fruitKey).join(",")})`;
		if (pct >= 0.5) {
			const part = document.createElement("span");
			part.style.width = `${pct}%`;
			part.style.background = rgb;
			part.title = `${nome}: ${Math.round(pct)}%`;
			explainStack.appendChild(part);
		}
		const item = document.createElement("li");
		item.innerHTML = `<i style="background:${rgb}"></i><span>${nome}</span><strong>${Math.round(pct)}%</strong>`;
		explainLegend.appendChild(item);
	});

	// Régua com a chance de estar estragada
	const chance = chanceMostrada(freshness.chance);
	setScaleMarker(scaleMarker, chance);
	explainChance.textContent = `A chance calculada foi ${chance}%. Abaixo de 40% a fruta é considerada fresca, entre 40% e 70% moderada e acima de 70% passada.`;

	// As 4 medidas que mais pesaram, com barra para os dois lados
	const fatores = contributions(freshness)
		.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
		.slice(0, 4);
	const maior = Math.max(...fatores.map((f) => Math.abs(f.valor)), 0.01);
	explainFactors.innerHTML = "";
	fatores.forEach(({ nome, valor }) => {
		const lado = valor >= 0 ? "passado" : "fresco";
		const largura = (Math.abs(valor) / maior) * 50;
		const item = document.createElement("li");
		item.innerHTML = `
			<span class="factor-name">${nome}</span>
			<span class="factor-track"><span class="factor-bar ${lado}" style="width:${largura}%"></span></span>
			<span class="factor-side ${lado}">${lado === "passado" ? "empurrou para passado" : "puxou para fresco"}</span>`;
		explainFactors.appendChild(item);
	});

	explainPanel.hidden = false;
}

// percent = null quando a pessoa escolheu a fruta no botão e o detector não confirmou.
// Antes aparecia "0%", que parecia que o site não tinha certeza nenhuma da fruta.
function setConfidence(percent) {
	const escolhida = percent === null;
	confidenceValue.textContent = escolhida ? "Escolhida no botão" : `${percent}%`;
	confidenceValue.classList.toggle("is-text", escolhida);
	confidenceTrack.hidden = escolhida;
	confidenceBar.style.width = `${escolhida ? 0 : percent}%`;
	confidenceTrack.setAttribute("aria-valuenow", escolhida ? 0 : percent);
}

// Coloca o marcador na régua (0 a 40% fresco, 40 a 70% moderado, 70 a 100% passado)
function setScaleMarker(marker, chance) {
	if (!marker) return;
	marker.style.left = `${chance}%`;
	marker.dataset.value = `${chance}%`;
	marker.classList.toggle("near-start", chance < 8);
	marker.classList.toggle("near-end", chance > 92);
}

function renderFruitState(fruitKey, freshness, detectionConfidence) {
	const { state } = freshness;
	const fruitName = fruitNames[fruitKey];

	// Resposta direta no topo do resultado
	if (verdict) {
		verdict.className = `verdict ${state.className}`;
		// Mostra a chance real calculada pelo modelo (antes mostrava a altura da barra, que confundia)
		verdictFruit.textContent = `${fruitName} · ${state.label} · ${chanceMostrada(freshness.chance)}% de chance de estar estragada`;
		verdictTitle.textContent = VEREDITOS[state.className];
		// Tira o começo da dica quando ele repete o título ("Consuma logo", "Evite consumir")
		const dica = state.tips[fruitKey].replace(/^(Consuma logo|Evite consumir)[.,]\s*/, "");
		verdictTip.textContent = dica.charAt(0).toUpperCase() + dica.slice(1);
		fillVerdictWhy(freshness);
	}
	if (detectionResult) detectionResult.hidden = false;

	detectedFruit.textContent = fruitName;
	freshnessStatus.textContent = state.label;
	freshnessStatus.className = `status-fresh ${state.className}`;
	freshnessReason.textContent = buildReason(freshness);
	// Uma régua só, com o mesmo número do topo (antes eram 3 barras com outros números)
	setScaleMarker(resultScaleMarker, chanceMostrada(freshness.chance));
	setConfidence(detectionConfidence ?? null);
	fillExplain(freshness);
}

// ---------------------------------------------------------------
// Cartão com a foto e todas as informações (imagem para baixar/compartilhar)
// ---------------------------------------------------------------
// Mesmas cores da página (papel de feira, tinta verde, banana e terracota)
const CARD_COLORS = {
	background: "#f4efe4",
	text: "#1f2a1e",
	soft: "#5e6656",
	track: "#e3dac8",
	accent: "#e8b923",
	fresco: "#3f7d3c",
	moderado: "#c98a12",
	passado: "#b5482b",
};

// Quebra o texto em linhas que cabem na largura e devolve a altura usada
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
	const words = text.split(" ");
	let line = "";
	let lines = 0;
	words.forEach((word) => {
		const test = line ? `${line} ${word}` : word;
		if (ctx.measureText(test).width > maxWidth && line) {
			ctx.fillText(line, x, y + lines * lineHeight);
			lines++;
			line = word;
		} else {
			line = test;
		}
	});
	if (line) {
		ctx.fillText(line, x, y + lines * lineHeight);
		lines++;
	}
	return lines * lineHeight;
}

function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

// Camada com a caixa verde e as manchas pintadas, no tamanho da foto
function buildOverlay(prediction, mask) {
	const overlay = document.createElement("canvas");
	overlay.width = photoCanvas.width;
	overlay.height = photoCanvas.height;
	const ctx = overlay.getContext("2d");
	const [x, y, w, h] = prediction.bbox;

	// A máscara de defeitos (160x160) é esticada de volta para o tamanho da fruta
	if (mask) {
		const maskCanvas = document.createElement("canvas");
		maskCanvas.width = mask.width;
		maskCanvas.height = mask.height;
		maskCanvas.getContext("2d").putImageData(mask, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(maskCanvas, x, y, w, h);
	}

	ctx.strokeStyle = CARD_COLORS.accent;
	ctx.lineWidth = Math.max(3, Math.round(photoCanvas.width / 250));
	ctx.strokeRect(x, y, w, h);
	return overlay;
}

async function carregarFontesDoCartao() {
	if (!document.fonts?.load) return;
	try {
		await Promise.all([
			document.fonts.load('600 100px "Fraunces"'),
			document.fonts.load('400 40px "Work Sans"'),
			document.fonts.load('600 44px "Work Sans"'),
			document.fonts.load('700 44px "Work Sans"'),
		]);
	} catch (error) {
		console.warn("Fontes não carregaram, o cartão usa a fonte padrão", error);
	}
}

function buildCard({ fruitKey, freshness, detectionConfidence, overlay, warning }) {
	const W = 1080;
	const PAD = 64;
	const scale = Math.min(W / photoCanvas.width, 1350 / photoCanvas.height);
	const photoW = Math.round(photoCanvas.width * scale);
	const photoH = Math.round(photoCanvas.height * scale);
	const panelH = 1500; // altura máxima; o que sobrar é cortado no fim

	const card = document.createElement("canvas");
	card.width = W;
	card.height = photoH + panelH;
	const ctx = card.getContext("2d");
	const font = (size, weight = 400) => `${weight} ${size}px "Work Sans", Arial, sans-serif`;
	const serif = (size, weight = 600) => `${weight} ${size}px Fraunces, Georgia, serif`;

	ctx.fillStyle = CARD_COLORS.background;
	ctx.fillRect(0, 0, W, card.height);

	// Foto com a caixa e as manchas por cima
	const photoX = Math.round((W - photoW) / 2);
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, W, photoH);
	ctx.drawImage(photoCanvas, photoX, 0, photoW, photoH);
	ctx.drawImage(overlay, photoX, 0, photoW, photoH);

	const { state } = freshness;
	const stateColor = CARD_COLORS[state.className];
	// Letras grandes: o cartão aparece com cerca de 1/3 do tamanho no celular
	let y = photoH + 84;

	// Cabeçalho: marca e data
	ctx.fillStyle = CARD_COLORS.fresco;
	ctx.font = serif(42);
	ctx.textAlign = "left";
	ctx.fillText("Fresh Food", PAD, y);
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(36);
	ctx.textAlign = "right";
	ctx.fillText(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), W - PAD, y);

	// Nome da fruta e selo do estado
	y += 116;
	ctx.textAlign = "left";
	ctx.fillStyle = CARD_COLORS.text;
	ctx.font = serif(100);
	const fruitName = fruitNames[fruitKey];
	ctx.fillText(fruitName, PAD, y);
	const nameWidth = ctx.measureText(fruitName).width;

	ctx.font = font(42, 700);
	const pillText = state.label.toUpperCase();
	const pillW = ctx.measureText(pillText).width + 56;
	const pillX = PAD + nameWidth + 36;
	ctx.fillStyle = stateColor;
	ctx.globalAlpha = 0.18;
	roundRect(ctx, pillX, y - 66, pillW, 80, 40);
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.fillStyle = stateColor;
	ctx.fillText(pillText, pillX + 28, y - 11);

	// Régua com a chance de estar estragada (o mesmo número do resultado na tela)
	const chance = chanceMostrada(freshness.chance);
	y += 92;
	ctx.textAlign = "left";
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(36);
	ctx.fillText("Chance de estar estragada", PAD, y);

	const scaleX = PAD;
	const scaleW = W - PAD * 2;
	const scaleH = 72;
	const scaleY = y + 96; // espaço em cima para o número
	const zonas = [
		["fresco", 0, 40],
		["moderado", 40, 70],
		["passado", 70, 100],
	];
	ctx.save();
	roundRect(ctx, scaleX, scaleY, scaleW, scaleH, 12);
	ctx.clip();
	zonas.forEach(([key, de, ate]) => {
		ctx.fillStyle = CARD_COLORS[key];
		ctx.globalAlpha = 0.18;
		ctx.fillRect(scaleX + (scaleW * de) / 100, scaleY, (scaleW * (ate - de)) / 100, scaleH);
		ctx.globalAlpha = 1;
	});
	ctx.restore();
	ctx.font = font(34, 600);
	ctx.textAlign = "center";
	zonas.forEach(([key, de, ate]) => {
		ctx.fillStyle = CARD_COLORS[key];
		ctx.fillText(statusStates[key].label, scaleX + (scaleW * (de + ate)) / 200, scaleY + scaleH / 2 + 12);
	});

	// Marcador e o número em cima dele
	const markX = scaleX + (scaleW * chance) / 100;
	ctx.fillStyle = CARD_COLORS.text;
	roundRect(ctx, markX - 3, scaleY - 12, 6, scaleH + 24, 3);
	ctx.fill();
	const numero = `${chance}%`;
	ctx.font = font(40, 700);
	const bolhaW = ctx.measureText(numero).width + 32;
	const bolhaX = Math.min(Math.max(markX - bolhaW / 2, scaleX), scaleX + scaleW - bolhaW);
	roundRect(ctx, bolhaX, scaleY - 76, bolhaW, 56, 10);
	ctx.fill();
	ctx.fillStyle = CARD_COLORS.background;
	ctx.fillText(numero, bolhaX + bolhaW / 2, scaleY - 34);

	// Marcas de 0, 40, 70 e 100%
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(30);
	[0, 40, 70, 100].forEach((v) => {
		ctx.textAlign = v === 0 ? "left" : v === 100 ? "right" : "center";
		ctx.fillText(`${v}%`, scaleX + (scaleW * v) / 100, scaleY + scaleH + 52);
	});
	y = scaleY + scaleH + 52 + 70;

	// Motivo e dica de uso
	y += 24;
	ctx.textAlign = "left";
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(40);
	y += drawWrappedText(ctx, buildReason(freshness), PAD, y, W - PAD * 2, 56);

	y += 30;
	ctx.fillStyle = CARD_COLORS.text;
	ctx.font = font(44, 600);
	y += drawWrappedText(ctx, state.tips[fruitKey], PAD, y, W - PAD * 2, 60);

	// Rodapé: certeza da detecção e, embaixo, a legenda das cores
	y += 36;
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(36);
	ctx.fillText(detectionConfidence === null ? "Fruta escolhida no botão" : `Certeza de que é ${fruitName.toLowerCase()}: ${detectionConfidence}%`, PAD, y);

	y += 62;
	const box = 30;
	ctx.strokeStyle = CARD_COLORS.accent;
	ctx.lineWidth = 4;
	ctx.strokeRect(PAD + 2, y - box + 2, box - 4, box - 4);
	ctx.fillText("Fruta encontrada", PAD + box + 16, y);
	const spotsX = PAD + box + 16 + ctx.measureText("Fruta encontrada").width + 48;
	ctx.fillStyle = "rgba(255, 64, 64, 0.8)";
	ctx.fillRect(spotsX, y - box, box, box);
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.fillText("Manchas e mofo", spotsX + box + 16, y);

	if (warning) {
		y += 70;
		ctx.fillStyle = CARD_COLORS.moderado;
		ctx.font = font(38, 600);
		y += drawWrappedText(ctx, warning, PAD, y, W - PAD * 2, 52) - 52;
	}

	// Corta o espaço que sobrou embaixo
	const trimmed = document.createElement("canvas");
	trimmed.width = W;
	trimmed.height = Math.min(card.height, Math.round(y + PAD));
	trimmed.getContext("2d").drawImage(card, 0, 0);
	return trimmed;
}

async function showCard(card, fruitKey) {
	const blob = await new Promise((resolve) => card.toBlob(resolve, "image/png"));
	presentCardBlob(blob, fruitKey);
}

// Mostra o cartão do resultado (de uma análise nova ou do histórico)
function presentCardBlob(blob, fruitKey) {
	lastCardBlob = blob;
	const today = new Date().toISOString().slice(0, 10);
	lastCardName = `fresh-food-${fruitNames[fruitKey].toLowerCase().replace("ç", "c").replace("ã", "a")}-${today}.png`;

	if (resultCard.src.startsWith("blob:")) URL.revokeObjectURL(resultCard.src);
	resultCard.src = URL.createObjectURL(blob);

	// Só mostra "Compartilhar" se o aparelho souber compartilhar imagens
	const file = new File([blob], lastCardName, { type: blob.type || "image/png" });
	shareButton.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));

	showingResult = true;
	closeCameraView();
	setHomeVisible(false);
	document.querySelector(".results")?.classList.add("has-result");
	photoResult.hidden = false;
	photoResult.scrollIntoView({ behavior: "smooth", block: "start" });
}

downloadButton.addEventListener("click", () => {
	if (!lastCardBlob) return;
	const link = document.createElement("a");
	link.href = resultCard.src;
	link.download = lastCardName;
	link.click();
});

shareButton.addEventListener("click", async () => {
	if (!lastCardBlob) return;
	const file = new File([lastCardBlob], lastCardName, { type: lastCardBlob.type || "image/png" });
	try {
		await navigator.share({ files: [file], title: "Fresh Food", text: "Resultado da análise de frescor" });
	} catch (error) {
		// A pessoa fechou a janela de compartilhar: não é erro
		if (error.name !== "AbortError") console.error(error);
	}
});

newPhotoButton.addEventListener("click", () => {
	showingResult = false;
	photoResult.hidden = true;
	openCameraView();
	clearCanvas();
	// Se a foto veio da galeria, a câmera ainda não foi aberta
	if (!cameraStarted) {
		if (!selectedMode) markMode("auto");
		startCamera();
	}
});

// ---------------------------------------------------------------
// Análise da foto
// ---------------------------------------------------------------
function fitPhotoCanvas(width, height) {
	const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
	photoCanvas.width = Math.round(width * scale);
	photoCanvas.height = Math.round(height * scale);
}

// Escolhe qual detecção usar: no modo automático, a fruta mais provável entre as três
function pickPrediction(predictions) {
	const mode = selectedMode ?? "auto";
	const allowed = mode === "auto" ? Object.keys(fruitNames) : [mode];
	return predictions
		.filter((p) => allowed.includes(p.class))
		.sort((a, b) => b.score - a.score)[0];
}

// Outras frutas encostadas ou por cima da fruta analisada (ex.: banca do supermercado).
// Elas entram na caixa e misturam o resultado. Fruta longe não atrapalha, então não conta.
const MIN_SCORE_OUTRA_FRUTA = 0.4;
const AVISO_VARIAS_FRUTAS = "Apareceu mais de uma fruta junto. Para um resultado melhor, segure uma fruta só na mão, longe das outras.";
function outrasFrutasJunto(predictions, escolhida) {
	if (!escolhida) return 0;
	const [x, y, w, h] = escolhida.bbox;
	return predictions.filter((p) => {
		if (p === escolhida || !(p.class in fruitNames) || p.score < MIN_SCORE_OUTRA_FRUTA) return false;
		const [px, py, pw, ph] = p.bbox;
		const ix = Math.max(0, Math.min(x + w, px + pw) - Math.max(x, px));
		const iy = Math.max(0, Math.min(y + h, py + ph) - Math.max(y, py));
		const inter = ix * iy;
		// a mesma fruta detectada duas vezes (caixas quase iguais) não conta
		const uniao = w * h + pw * ph - inter;
		if (inter / uniao > 0.6) return false;
		// conta se pelo menos 10% da outra fruta está dentro da caixa analisada
		return inter > 0.1 * pw * ph;
	}).length;
}

function fruitWanted() {
	return !selectedMode || selectedMode === "auto" ? "banana, maçã ou laranja" : fruitNames[selectedMode].toLowerCase();
}

// Mostra um recado por cima da câmera por alguns segundos
let noticeTimer;
function showNotice(message) {
	if (cameraCard.hidden) {
		showToast(message);
		return;
	}
	cameraLock.classList.remove("is-hidden");
	cameraMessage.textContent = message;
	window.clearTimeout(noticeTimer);
	if (cameraStarted) {
		noticeTimer = window.setTimeout(() => cameraLock.classList.add("is-hidden"), 3500);
	}
}

// Maçã ou laranja: se a cor da casca discorda do detector com força, avisa (não troca sozinho).
// Só vale quando a pessoa deixou o app escolher a fruta.
function avisoMacaLaranja(fruitKey, freshness) {
	if (selectedMode && selectedMode !== "auto") return null;
	if (fruitKey !== "apple" && fruitKey !== "orange") return null;
	const laranja = chanceLaranjaPelaCor(freshness.corFruta);
	const outra = fruitKey === "apple" ? laranja : 1 - laranja;
	if (outra < COR_FRUTA_AVISO) return null;
	const nome = fruitKey === "apple" ? "laranja" : "maçã";
	return `Pela cor, esta fruta parece mais uma ${nome}. Se for, toque na ${nome} lá em cima e analise de novo.`;
}

async function analyzePhoto() {
	await ensureDetector();

	// Tempo de cada etapa (para comparar com os 380 ms do FreshNet)
	const t0 = performance.now();
	const predictions = await detectObjects(photoCanvas);
	const t1 = performance.now();
	let prediction = pickPrediction(predictions);
	let manual = false;

	// Se a pessoa escolheu a fruta no botão e o detector achou outra fruta no lugar
	// (ex.: chamou a maçã de laranja), usa a caixa que ele achou, com a fruta escolhida
	if (!prediction && selectedMode && selectedMode !== "auto") {
		const outra = predictions.filter((p) => p.class in fruitNames).sort((a, b) => b.score - a.score)[0];
		if (outra) {
			prediction = { class: selectedMode, score: outra.score, bbox: outra.bbox };
			manual = true;
		}
	}

	if (!prediction) {
		// Se a pessoa escolheu a fruta no botão, analisa o centro da foto mesmo assim
		if (selectedMode && selectedMode !== "auto") {
			const side = Math.min(photoCanvas.width, photoCanvas.height) * 0.7;
			prediction = {
				class: selectedMode,
				score: 0,
				bbox: [(photoCanvas.width - side) / 2, (photoCanvas.height - side) / 2, side, side],
			};
			manual = true;
		} else {
			// Mantém o resultado anterior inteiro na tela e só avisa
			showNotice(`Não encontrei ${fruitWanted()} na foto. Tente mais perto, com a fruta inteira e um fundo liso.`);
			return;
		}
	}

	const fruitKey = prediction.class;
	const { freshness, mask } = analyzeFruit(fruitKey, prediction.bbox);
	const t2 = performance.now();
	freshness.timing = { deteccao: t1 - t0, analise: t2 - t1 };
	const detectionConfidence = manual ? null : Math.round(prediction.score * 100);
	const warnings = [sharpnessMessage(freshness.sharpness), outlierMessage(freshness), lightMessage(freshness.avg.brightness)];
	if (manual && prediction.score === 0) warnings.push("A fruta não foi localizada automaticamente: foi analisado o centro da foto.");
	if (outrasFrutasJunto(predictions, prediction)) warnings.push(AVISO_VARIAS_FRUTAS);
	const avisoCor = avisoMacaLaranja(fruitKey, freshness);
	if (avisoCor) warnings.push(avisoCor);
	const warning = warnings.filter(Boolean).join(" ") || null;

	renderFruitState(fruitKey, freshness, detectionConfidence);
	showWarnings(warnings.filter(Boolean));

	// Garante que as fontes já carregaram antes de desenhar o cartão (senão ele sai com Arial)
	await carregarFontesDoCartao();

	// Caixa verde e defeitos pintados de vermelho por cima da foto
	const overlay = buildOverlay(prediction, mask);
	const card = buildCard({ fruitKey, freshness, detectionConfidence, overlay, warning });
	await showCard(card, fruitKey);

	// Guarda no histórico (sem travar a tela se der erro)
	saveToHistory({ fruitKey, freshness, detectionConfidence, warnings: warnings.filter(Boolean), bbox: prediction.bbox, card })
		.catch((error) => console.warn("Não foi possível guardar no histórico", error));
}

async function runAnalysis(prepare) {
	captureButton.disabled = true;
	galleryButton.disabled = true;
	captureButton.classList.add("is-busy");
	setLiveHint("Analisando a fruta...");
	try {
		await prepare();
		await analyzePhoto();
	} catch (error) {
		console.error(error);
		showNotice(errorMessages[error.name] ?? "Não foi possível analisar a foto. Tente de novo.");
	} finally {
		captureButton.classList.remove("is-busy");
		captureButton.disabled = !cameraStarted || !detector;
		galleryButton.disabled = false;
	}
}

captureButton.addEventListener("click", () => {
	runAnalysis(async () => {
		fitPhotoCanvas(cameraFeed.videoWidth, cameraFeed.videoHeight);
		photoContext.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
	});
});

galleryButton.addEventListener("click", () => galleryInput.click());

galleryInput.addEventListener("change", () => {
	const file = galleryInput.files?.[0];
	galleryInput.value = "";
	if (!file) return;
	if (!selectedMode) markMode("auto");

	runAnalysis(async () => {
		const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
		fitPhotoCanvas(bitmap.width, bitmap.height);
		photoContext.drawImage(bitmap, 0, 0, photoCanvas.width, photoCanvas.height);
		bitmap.close?.();
	});
});

// ---------------------------------------------------------------
// Visor ao vivo: só mostra a caixa, para ajudar a enquadrar
// ---------------------------------------------------------------
function clearCanvas() {
	detectionCanvas.getContext("2d").clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
}

function drawBox(prediction) {
	const [x, y, width, height] = prediction.bbox;
	const context = detectionCanvas.getContext("2d");
	context.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
	context.strokeStyle = CARD_COLORS.accent;
	context.lineWidth = 3;
	context.strokeRect(x, y, width, height);
}

function setLiveHint(message, ready = false) {
	liveHint.hidden = !message;
	liveHint.textContent = message ?? "";
	liveHint.classList.toggle("is-ready", ready);
}

async function detectLive() {
	if (showingResult || detectionInProgress || !selectedMode || !detector || cameraFeed.readyState < 2) {
		return;
	}

	detectionInProgress = true;
	try {
		const predictions = await detectObjects(cameraFeed);
		const prediction = pickPrediction(predictions);

		if (prediction) {
			missCount = 0;
			drawBox(prediction);
			if (outrasFrutasJunto(predictions, prediction)) setLiveHint(AVISO_VARIAS_FRUTAS);
			else setLiveHint(`${fruitNames[prediction.class]} encontrada! Pode fotografar.`, true);
		} else {
			missCount++;
			if (missCount >= MAX_MISSES) {
				clearCanvas();
				const dica = selectedMode === "auto" && missCount >= MAX_MISSES * 3 ? " Dica: chegue mais perto." : "";
				const dicaManual = selectedMode !== "auto" && missCount >= MAX_MISSES * 3 ? " Pode fotografar mesmo assim." : "";
				setLiveHint(`Aponte a câmera para uma ${fruitWanted()}.${dica}${dicaManual}`, Boolean(dicaManual));
			}
		}
	} finally {
		detectionInProgress = false;
	}
}

// Cada vez que a câmera é fechada, o número muda. Se a câmera terminar de abrir
// depois de a pessoa ter voltado, ela é desligada na hora (antes ficava ligada escondida).
let cameraSession = 0;

async function startCapture() {
	if (cameraStarted) return;
	const sessao = cameraSession;

	if (!navigator.mediaDevices?.getUserMedia) {
		const error = new Error("Câmera não suportada neste navegador.");
		error.name = "NotSupportedError";
		throw error;
	}

	const stream = await navigator.mediaDevices.getUserMedia({
		video: { facingMode: { ideal: "environment" } },
		audio: false,
	});

	if (sessao !== cameraSession || cameraCard.hidden) {
		stream.getTracks().forEach((track) => track.stop());
		const error = new Error("A câmera foi fechada antes de abrir");
		error.name = "CameraClosed";
		throw error;
	}

	cameraFeed.srcObject = stream;
	await cameraFeed.play();
	detectionCanvas.width = cameraFeed.videoWidth;
	detectionCanvas.height = cameraFeed.videoHeight;
	cameraStarted = true;
}

const errorMessages = {
	NotAllowedError: "Permissão da câmera bloqueada. Clique no cadeado do navegador e permita o acesso. Você ainda pode usar uma foto da galeria.",
	NotReadableError: "A câmera está sendo usada por outro app (Teams, Zoom, WhatsApp...). Feche e tente de novo.",
	NotFoundError: "Nenhuma câmera encontrada. Você ainda pode usar uma foto da galeria.",
	NotSupportedError: "Este navegador não permite usar a câmera. Você ainda pode usar uma foto da galeria.",
	ModelError: "Não foi possível carregar o modelo de detecção. Verifique sua internet e recarregue a página.",
};

// O modelo começa a carregar assim que a página abre (não espera o clique).
// Depois de carregar, faz uma detecção "de aquecimento": a primeira detecção
// é sempre lenta porque o navegador prepara a placa de vídeo (WebGL).
let detectorPromise = null;
function ensureDetector() {
	if (detector) return Promise.resolve();
	if (!detectorPromise) {
		detectorPromise = (async () => {
			if (typeof cocoSsd === "undefined") {
				const error = new Error("COCO-SSD não carregou");
				error.name = "ModelError";
				throw error;
			}
			if (typeof tf !== "undefined") {
				try {
					await tf.setBackend("webgl");
				} catch (error) {
					console.warn("WebGL indisponível, usando o padrão", error);
				}
				await tf.ready();
			}
			const model = await cocoSsd.load();
			const warmup = document.createElement("canvas");
			warmup.width = 300;
			warmup.height = 300;
			await model.detect(warmup);
			detector = model;
		})().catch((error) => {
			detectorPromise = null;
			throw error;
		});
	}
	return detectorPromise;
}

// Lista de detecções do COCO-SSD. O limite padrão (50%) descartava muitas
// frutas; como só olhamos banana, maçã e laranja, dá para aceitar a partir de 25%.
const DETECT_MIN_SCORE = 0.25;
function detectObjects(input) {
	return detector.detect(input, 20, DETECT_MIN_SCORE);
}

// Começa a carregar o modelo em segundo plano logo que a página abre
window.addEventListener("load", () => {
	ensureDetector().catch((error) => console.warn("Modelo ainda não carregou", error));
});

async function startCamera() {
	try {
		await startCapture();
		if (!detector) cameraMessage.textContent = "Preparando a detecção (só demora na primeira vez)...";
		await ensureDetector();
		if (cameraCard.hidden) return; // a pessoa voltou enquanto o modelo carregava

		if (!detectionLoopStarted) {
			window.setInterval(detectLive, 500);
			detectionLoopStarted = true;
		}

		captureButton.disabled = false;
		cameraLock.classList.add("is-hidden");
		cameraFrame?.classList.remove("is-error");
		setLiveHint(`Aponte a câmera para uma ${fruitWanted()}`);
	} catch (error) {
		if (error.name === "CameraClosed") return;
		console.error(error);
		cameraFrame?.classList.add("is-error");
		cameraLock.classList.remove("is-hidden");
		cameraMessage.textContent = errorMessages[error.name] ?? "Não foi possível acessar a câmera. Você ainda pode usar uma foto da galeria.";
	}
}

function markMode(mode) {
	selectedMode = mode;
	fruitOptions.forEach((option) => {
		option.setAttribute("aria-pressed", option.dataset.fruit === mode);
	});
}

function selectMode(mode) {
	markMode(mode);
	missCount = 0;
	clearCanvas();

	// Abre a câmera em tela cheia
	if (showingResult) {
		showingResult = false;
		photoResult.hidden = true;
	}
	openCameraView();

	if (cameraStarted) setLiveHint(`Aponte a câmera para uma ${fruitWanted()}`);
	startCamera();
}

// Tocar numa fruta lá em cima só escolhe a fruta (tocar de novo desmarca).
// A câmera abre no botão "Analisar fruta".
fruitOptions.forEach((option) => {
	option.addEventListener("click", () => {
		const fruit = option.dataset.fruit;
		markMode(selectedMode === fruit ? null : fruit);
		updateAnalyzeLabel();
	});
});

function updateAnalyzeLabel() {
	const label = analyzeButton?.querySelector(".analyze-label");
	if (!label) return;
	const fruit = selectedMode && selectedMode !== "auto" ? fruitNames[selectedMode].toLowerCase() : "fruta";
	label.textContent = `Analisar ${fruit}`;
}

// ---------------------------------------------------------------
// Câmera em tela cheia
// ---------------------------------------------------------------
function hideResults() {
	document.querySelector(".results")?.classList.remove("has-result");
	photoResult.hidden = true;
	if (detectionResult) detectionResult.hidden = true;
	if (explainPanel) explainPanel.hidden = true;
}

let focoAntesDaCamera = null;

function openCameraView() {
	if (cameraCard.hidden) focoAntesDaCamera = document.activeElement;
	setHomeVisible(false);
	hideResults();
	cameraCard.hidden = false;
	document.body.classList.add("camera-open");
	if (cameraHelp) cameraHelp.hidden = true;
	cameraBack?.focus();
}

// Fecha a câmera e desliga a imagem (economiza bateria)
function closeCameraView() {
	const estavaAberta = !cameraCard.hidden;
	cameraCard.hidden = true;
	document.body.classList.remove("camera-open");
	stopCapture();
	// Devolve o foco para onde a pessoa estava (ou para o botão principal)
	if (estavaAberta) {
		const alvo = focoAntesDaCamera && focoAntesDaCamera.offsetParent ? focoAntesDaCamera : analyzeButton;
		alvo?.focus({ preventScroll: true });
	}
}

// Com a câmera aberta, o Tab fica circulando só pelos botões dela
cameraCard.addEventListener("keydown", (event) => {
	if (event.key !== "Tab") return;
	const focaveis = [...cameraCard.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent);
	if (!focaveis.length) return;
	const primeiro = focaveis[0];
	const ultimo = focaveis[focaveis.length - 1];
	if (event.shiftKey && document.activeElement === primeiro) {
		event.preventDefault();
		ultimo.focus();
	} else if (!event.shiftKey && document.activeElement === ultimo) {
		event.preventDefault();
		primeiro.focus();
	}
});

function stopCapture() {
	cameraSession++;
	const stream = cameraFeed.srcObject;
	if (stream) stream.getTracks().forEach((track) => track.stop());
	cameraFeed.srcObject = null;
	cameraStarted = false;
	captureButton.disabled = true;
	clearCanvas();
	setLiveHint(null);
	cameraLock.classList.remove("is-hidden");
	cameraMessage.textContent = "Abrindo a câmera...";
}

cameraBack?.addEventListener("click", () => {
	closeCameraView();
	if (!showingResult) setHomeVisible(true);
});

helpButton?.addEventListener("click", () => {
	cameraHelp.hidden = false;
});
cameraHelpClose?.addEventListener("click", () => {
	cameraHelp.hidden = true;
});
cameraHelp?.addEventListener("click", (event) => {
	if (event.target === cameraHelp) cameraHelp.hidden = true;
});

// Botão "+": ainda não funciona, só avisa que está em desenvolvimento
document.querySelector("#fruit-add")?.addEventListener("click", () => {
	showToast("Opção em desenvolvimento: em breve você poderá adicionar outras frutas.");
});

// Recado rápido na parte de baixo da tela (quando a câmera está fechada)
let toastTimer;
function showToast(message) {
	if (!toast) return;
	toast.textContent = message;
	toast.hidden = false;
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5000);
}

// "Analisar fruta": abre a câmera. Sem fruta escolhida em cima, usa o modo automático.
analyzeButton?.addEventListener("click", () => selectMode(selectedMode ?? "auto"));
updateAnalyzeLabel();

// "ou escolher uma foto da galeria"
stepsGallery?.addEventListener("click", () => galleryInput.click());

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		if (!cameraCard.hidden) cameraBack?.click();
	}
});

// ---------------------------------------------------------------
// Funcionar sem internet (app instalável)
// O service worker (sw.js) guarda o site e o modelo no aparelho.
// ---------------------------------------------------------------
const offlinePill = document.querySelector("#offline-pill");
const offlinePillStatus = document.querySelector("#offline-pill-status");
const offlinePillHint = document.querySelector("#offline-pill-hint");
let modeloGuardado = false;
let installPrompt = null;
const swDisponivel = "serviceWorker" in navigator && window.isSecureContext;

// Estados do botão: pronto, preparando, sem internet agora, indisponível
function updateOfflineStatus() {
	if (!offlinePill) return;
	let estado;
	let titulo;
	let dica;
	if (!swDisponivel) {
		estado = "is-off";
		titulo = "Indisponível";
		dica = "Este navegador não permite guardar o app";
	} else if (!navigator.onLine) {
		estado = "is-offline";
		titulo = modeloGuardado ? "Funcionando sem internet" : "Sem internet";
		dica = modeloGuardado ? "Usando a versão guardada no celular" : "Conecte uma vez para guardar o app";
	} else if (modeloGuardado) {
		estado = "is-ready";
		titulo = "Pronto";
		dica = installPrompt ? "Toque para instalar no celular" : "Já pode usar sem internet";
	} else {
		estado = "is-preparing";
		titulo = "Preparando...";
		dica = "Deixe a internet ligada por alguns segundos";
	}
	offlinePill.className = `offline-pill ${estado}`;
	offlinePillStatus.textContent = titulo;
	offlinePillHint.textContent = dica;
	offlinePill.setAttribute("aria-label", `Uso sem internet: ${titulo}. ${dica}`);
}

if (swDisponivel) {
	window.addEventListener("load", async () => {
		try {
			await navigator.serviceWorker.register("./sw.js");
			const registration = await navigator.serviceWorker.ready;
			navigator.serviceWorker.addEventListener("message", (event) => {
				if (event.data?.tipo === "modelo") {
					modeloGuardado = event.data.pronto;
					updateOfflineStatus();
				}
			});
			registration.active?.postMessage("modelo-pronto?");
		} catch (error) {
			console.warn("Não foi possível ativar o modo sem internet", error);
		}
	});
}

window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);
updateOfflineStatus();

// Chrome/Android avisa quando o site pode ser instalado
window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	installPrompt = event;
	updateOfflineStatus();
});

window.addEventListener("appinstalled", () => {
	installPrompt = null;
	updateOfflineStatus();
	showToast("Fresh Food instalado! O ícone já está na tela inicial.");
});

offlinePill?.addEventListener("click", async () => {
	if (installPrompt) {
		installPrompt.prompt();
		await installPrompt.userChoice;
		installPrompt = null;
		updateOfflineStatus();
		return;
	}
	const mensagens = {
		"is-ready": "Pronto! O Fresh Food já está guardado neste celular e funciona sem internet. Para ter o ícone na tela inicial, use \"Adicionar à tela inicial\" no menu do navegador.",
		"is-preparing": "Estamos guardando o app e o modelo no celular. Deixe a internet ligada por alguns segundos.",
		"is-offline": modeloGuardado ? "Você está sem internet, mas o Fresh Food continua funcionando com a versão guardada." : "Você está sem internet. Conecte uma vez para o app ser guardado no celular.",
		"is-off": "Este navegador não permite guardar o app para uso sem internet. Tente pelo Chrome ou Safari.",
	};
	const estado = [...offlinePill.classList].find((c) => c.startsWith("is-"));
	showToast(mensagens[estado]);
});

// ---------------------------------------------------------------
// Histórico de análises (guardado só neste celular, no IndexedDB)
// ---------------------------------------------------------------
const HISTORICO_MAX = 12;
const historySection = document.querySelector("#history");
const historyList = document.querySelector("#history-list");
const historyCount = document.querySelector("#history-count");
const historyClear = document.querySelector("#history-clear");
const resultHome = document.querySelector("#result-home");

function abrirBanco() {
	return new Promise((resolve, reject) => {
		if (!("indexedDB" in window)) {
			reject(new Error("IndexedDB indisponível"));
			return;
		}
		const pedido = indexedDB.open("fresh-food", 1);
		pedido.onupgradeneeded = () => {
			pedido.result.createObjectStore("historico", { keyPath: "id" });
		};
		pedido.onsuccess = () => resolve(pedido.result);
		pedido.onerror = () => reject(pedido.error);
	});
}

async function banco(modo, acao) {
	const db = await abrirBanco();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("historico", modo);
		const store = tx.objectStore("historico");
		const pedido = acao(store);
		tx.oncomplete = () => resolve(pedido?.result);
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

const lerHistorico = async () => ((await banco("readonly", (st) => st.getAll())) ?? []).sort((a, b) => b.id - a.id);
const apagarItem = (id) => banco("readwrite", (st) => st.delete(id));
const guardarItem = (item) => banco("readwrite", (st) => st.put(item));
const limparHistorico = () => banco("readwrite", (st) => st.clear());

function canvasParaBlob(canvas, tipo, qualidade) {
	return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

// Miniatura quadrada da fruta, sem distorcer
function criarMiniatura(bbox) {
	const [x, y, w, h] = bbox;
	const lado = Math.max(w, h) * 1.1;
	const cx = x + w / 2;
	const cy = y + h / 2;
	const mini = document.createElement("canvas");
	mini.width = 200;
	mini.height = 200;
	const ctx = mini.getContext("2d");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, 200, 200);
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(photoCanvas, cx - lado / 2, cy - lado / 2, lado, lado, 0, 0, 200, 200);
	return canvasParaBlob(mini, "image/jpeg", 0.8);
}

async function saveToHistory({ fruitKey, freshness, detectionConfidence, warnings, bbox, card }) {
	// Cartão em tamanho menor (para caber mais no celular)
	const menor = document.createElement("canvas");
	const escala = Math.min(1, 720 / card.width);
	menor.width = Math.round(card.width * escala);
	menor.height = Math.round(card.height * escala);
	menor.getContext("2d").drawImage(card, 0, 0, menor.width, menor.height);

	const recorte = document.createElement("canvas");
	recorte.width = LADO_ANALISE;
	recorte.height = LADO_ANALISE;
	recorte.getContext("2d").putImageData(freshness.crop, 0, 0);

	const item = {
		id: Date.now(),
		fruitKey,
		stateKey: freshness.state.className,
		percent: freshness.percent,
		avg: freshness.avg,
		chance: freshness.chance,
		features: freshness.features,
		sharpness: freshness.sharpness,
		outlier: freshness.outlier,
		outlierLimit: freshness.outlierLimit,
		timing: freshness.timing,
		detectionConfidence,
		warnings,
		thumb: await criarMiniatura(bbox),
		card: await canvasParaBlob(menor, "image/jpeg", 0.82),
		crop: await canvasParaBlob(recorte, "image/png"),
	};

	let itens = await lerHistorico();
	const estavaCheio = itens.length >= HISTORICO_MAX;
	// Abre espaço apagando as mais antigas
	while (itens.length >= HISTORICO_MAX) {
		await apagarItem(itens.pop().id);
	}

	// Se o navegador ficar sem espaço, apaga a mais antiga e tenta de novo
	let guardou = false;
	let apagouPorEspaco = false;
	for (let tentativa = 0; tentativa < 4 && !guardou; tentativa++) {
		try {
			await guardarItem(item);
			guardou = true;
		} catch (error) {
			if (error?.name !== "QuotaExceededError" || !itens.length) throw error;
			await apagarItem(itens.pop().id);
			apagouPorEspaco = true;
		}
	}

	if (!guardou) {
		showToast("Não deu para guardar esta análise: o navegador está sem espaço. Toque em Limpar no histórico.");
	} else if (apagouPorEspaco) {
		showToast("O espaço do navegador acabou. Apagamos as análises mais antigas para guardar esta.");
	} else if (estavaCheio) {
		showToast(`Histórico cheio: guardamos só as últimas ${HISTORICO_MAX} análises. A mais antiga foi apagada.`);
	} else if (itens.length + 1 === HISTORICO_MAX) {
		showToast(`Seu histórico chegou a ${HISTORICO_MAX} análises, o limite. Nas próximas, a mais antiga será apagada.`);
	} else if (navigator.storage?.estimate) {
		const { usage = 0, quota = 0 } = await navigator.storage.estimate();
		if (quota && usage / quota > 0.9) {
			showToast("O espaço do navegador está quase cheio. Toque em Limpar no histórico para liberar espaço.");
		}
	}

	await renderHistory();
}

const VEREDITO_CURTO = { fresco: "Pode consumir", moderado: "Consuma logo", passado: "Não consumir" };
let historyUrls = [];

async function renderHistory() {
	if (!historySection) return;
	let itens = [];
	try {
		itens = await lerHistorico();
	} catch (error) {
		historySection.hidden = true;
		return;
	}

	historyUrls.forEach((url) => URL.revokeObjectURL(url));
	historyUrls = [];
	historyList.innerHTML = "";

	itens.forEach((item) => {
		const url = URL.createObjectURL(item.thumb);
		historyUrls.push(url);
		const data = new Date(item.id).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
		const botao = document.createElement("button");
		botao.type = "button";
		botao.className = "history-item";
		botao.setAttribute("role", "listitem");
		botao.innerHTML = `
			<img src="${url}" alt="">
			<span class="history-info">
				<span class="history-date">${data}</span>
				<strong>${fruitNames[item.fruitKey]}</strong>
				<span class="history-badge ${item.stateKey}">${VEREDITO_CURTO[item.stateKey]}</span>
			</span>`;
		botao.addEventListener("click", () => openHistoryItem(item));
		historyList.appendChild(botao);
	});

	historyCount.textContent = `${itens.length} de ${HISTORICO_MAX}`;
	historyCount.classList.toggle("is-full", itens.length >= HISTORICO_MAX);
	if (telaComputador.matches) homeVisible = true;
	historySection.hidden = itens.length === 0 || !homeVisible;
}

// Abre de novo o resultado completo de uma análise antiga
async function openHistoryItem(item) {
	const bitmap = await createImageBitmap(item.crop);
	const recorte = document.createElement("canvas");
	recorte.width = LADO_ANALISE;
	recorte.height = LADO_ANALISE;
	const ctx = recorte.getContext("2d", { willReadFrequently: true });
	ctx.drawImage(bitmap, 0, 0);
	const crop = ctx.getImageData(0, 0, LADO_ANALISE, LADO_ANALISE);
	const medido = measureFruit(crop, item.fruitKey);

	const freshness = {
		key: item.stateKey,
		state: statusStates[item.stateKey],
		percent: item.percent,
		avg: item.avg,
		chance: item.chance,
		features: item.features,
		fruitKey: item.fruitKey,
		crop,
		categoryMap: medido.categoryMap,
		counts: medido.counts,
		sharpness: item.sharpness,
		outlier: item.outlier,
		outlierLimit: item.outlierLimit,
		timing: item.timing,
	};

	renderFruitState(item.fruitKey, freshness, item.detectionConfidence);
	showWarnings(item.warnings ?? []);
	presentCardBlob(item.card, item.fruitKey);
	const data = new Date(item.id).toISOString().slice(0, 10);
	lastCardName = `fresh-food-${fruitNames[item.fruitKey].toLowerCase().replace("ç", "c").replace("ã", "a")}-${data}.jpg`;
}

historyClear?.addEventListener("click", async () => {
	if (!window.confirm("Apagar todas as análises do histórico?")) return;
	await limparHistorico();
	await renderHistory();
	showToast("Histórico apagado.");
});

// Tela inicial (cartão dos 3 passos + histórico).
// No computador ela fica sempre à esquerda e o resultado aparece à direita.
const telaComputador = window.matchMedia("(min-width: 1101px)");

let homeVisible = true;
function setHomeVisible(visivel) {
	if (telaComputador.matches) visivel = true;
	homeVisible = visivel;
	if (stepsCard) stepsCard.hidden = !visivel;
	if (offlinePill) offlinePill.hidden = !visivel;
	if (historySection) historySection.hidden = !visivel || !historyList.children.length;
}

resultHome?.addEventListener("click", () => {
	showingResult = false;
	hideResults();
	setHomeVisible(true);
	window.scrollTo({ top: 0, behavior: "smooth" });
});

renderHistory();

// Se a pessoa redimensionar a janela para o tamanho de computador, mostra a tela inicial
telaComputador.addEventListener?.("change", () => {
	if (telaComputador.matches) setHomeVisible(true);
	else if (showingResult) setHomeVisible(false);
});
