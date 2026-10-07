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
const leftSidebar = document.querySelector(".sidebar-left");
const mobileOverlay = document.querySelector(".mobile-shell-overlay");

const fruitNames = {
	apple: "Maçã",
	banana: "Banana",
	orange: "Laranja",
};


const fruitImages = {
	banana: "./IMG/banana.png",
	apple: "./IMG/maca.png",
	orange: "./IMG/laranja.png",
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
			banana: "Evite consumir. Se não tiver mofo nem cheiro ruim, ainda pode ir para bolo.",
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
// (Kaggle). Separando por foto original, acertou 96% em 498 fotos
// que não foram usadas no treino (antes: 80% com a fórmula antiga).
// O script de treino está em Docs/treino/.
// ---------------------------------------------------------------

// Faixas de "cor viva" de cada fruta (matiz em graus, saturação e brilho mínimos)
const CORES_VIVAS = {
	banana: { hue: [[35, 100]], satMin: 0.35, valMin: 0.35 },
	orange: { hue: [[20, 45]], satMin: 0.4, valMin: 0.35 },
	apple: { hue: [[0, 15], [345, 360], [70, 130]], satMin: 0.35, valMin: 0.35 },
};

// Números do classificador (gerados por Docs/treino/treinar.py)
// Ordem: corViva, marrom, mofo, escuro, apagado, saturacao, brilho, textura
const MODELO = {
	banana: {
		media: [0.503528, 0.15682, 0.170481, 0.034416, 0.134755, 0.441454, 0.724046, 0.052189],
		desvio: [0.38716, 0.227486, 0.189464, 0.070657, 0.146604, 0.14923, 0.216871, 0.031951],
		pesos: [-1.1291, 1.1165, 0.6038, 0.2808, 0.3335, -0.1931, -1.1012, 0.854],
		base: -0.6002,
	},
	apple: {
		media: [0.425647, 0.067909, 0.056719, 0.004806, 0.444919, 0.559031, 0.731727, 0.038491],
		desvio: [0.335319, 0.10498, 0.053459, 0.024619, 0.313567, 0.089281, 0.103427, 0.015167],
		pesos: [-1.4271, 3.1222, -0.1261, -0.2484, 0.5218, -0.0942, 1.9114, 2.9038],
		base: 1.2851,
	},
	orange: {
		media: [0.642553, 0.017715, 0.117003, 0.003202, 0.219527, 0.599116, 0.852287, 0.027237],
		desvio: [0.279602, 0.047545, 0.169605, 0.008914, 0.188098, 0.1382, 0.090561, 0.015025],
		pesos: [-0.7512, 2.0641, 0.8453, 0.0658, -0.1704, -2.2292, 1.3734, 0.8003],
		base: -0.6181,
	},
};

// Detecção de foto fora do padrão (versão simples da "detecção de anomalia" do FreshNet).
// Mede a distância de Mahalanobis entre as 8 medidas da foto e as fotos de calibração.
// Se passar do limite, a foto é diferente do que o sistema aprendeu e o resultado merece desconfiança.
// O limite deixa passar 97,5% das fotos normais. Gerado por Docs/treino/avaliar_metricas.py
const ANOMALIA = {
	banana: {
		limite: 4.204,
		inversa: [
			[12.8369, 5.40255, 4.43906, 1.13844, 4.24819, -1.50612, -2.10909, 0.24362],
			[5.40255, 6.10123, 3.23399, 1.89363, 2.20732, -0.11008, 3.20064, -0.05404],
			[4.43906, 3.23399, 4.91336, 1.50361, 2.03147, 2.70798, 0.26276, -0.16573],
			[1.13844, 1.89363, 1.50361, 2.30206, 0.64167, 1.15451, 1.79421, -0.01501],
			[4.24819, 2.20732, 2.03147, 0.64167, 2.42141, 0.09215, -0.60095, -0.3381],
			[-1.50612, -0.11008, 2.70798, 1.15451, 0.09215, 5.29137, -0.7217, -0.29921],
			[-2.10909, 3.20064, 0.26276, 1.79421, -0.60095, -0.7217, 7.82848, 1.22659],
			[0.24362, -0.05404, -0.16573, -0.01501, -0.3381, -0.29921, 1.22659, 1.78446],
		],
	},
	apple: {
		limite: 5.345,
		inversa: [
			[10.2946, 3.14416, 1.43896, 0.74053, 9.0226, -0.22601, 0.24015, 0.15011],
			[3.14416, 2.71262, 0.39901, 0.21418, 2.34058, 0.10562, 1.1628, -0.22031],
			[1.43896, 0.39901, 1.89238, 0.14409, 1.40343, 1.00902, 0.2825, -0.05439],
			[0.74053, 0.21418, 0.14409, 1.24299, 0.5845, 0.37151, 0.33576, -0.06959],
			[9.0226, 2.34058, 1.40343, 0.5845, 9.28274, 0.00514, -0.72063, -0.07203],
			[-0.22601, 0.10562, 1.00902, 0.37151, 0.00514, 1.76967, 0.16958, -0.13096],
			[0.24015, 1.1628, 0.2825, 0.33576, -0.72063, 0.16958, 2.31266, 0.38764],
			[0.15011, -0.22031, -0.05439, -0.06959, -0.07203, -0.13096, 0.38764, 1.23277],
		],
	},
	orange: {
		limite: 5.705,
		inversa: [
			[11.864, 1.66731, 5.05799, 0.09759, 7.10715, -1.91154, -0.48144, 0.08988],
			[1.66731, 1.47798, 1.06859, 0.0787, 1.2361, -0.27897, 0.66, -0.45219],
			[5.05799, 1.06859, 7.0386, 0.54229, 3.87274, 3.54924, 0.54546, 0.14734],
			[0.09759, 0.0787, 0.54229, 1.12123, 0.24074, 0.30634, 0.65038, 0.05587],
			[7.10715, 1.2361, 3.87274, 0.24074, 5.61959, -0.30284, 0.02616, -0.15481],
			[-1.91154, -0.27897, 3.54924, 0.30634, -0.30284, 5.44548, 0.04594, 0.40113],
			[-0.48144, 0.66, 0.54546, 0.65038, 0.02616, 0.04594, 2.64413, 0.76797],
			[0.08988, -0.45219, 0.14734, 0.05587, -0.15481, 0.40113, 0.76797, 1.60474],
		],
	},
};

// Nitidez mínima (variância do Laplaciano numa versão 256x256 da fruta).
// Calibrado no dataset: marca 2,6% das fotos nítidas e 57% das fotos levemente borradas.
const LADO_NITIDEZ = 256;
const LIMITE_NITIDEZ = 12;

// Textura a partir da qual a casca é considerada irregular (meio-termo entre fresca e estragada)
const TEXTURA_IRREGULAR = { banana: 0.058, apple: 0.037, orange: 0.031 };

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

const statusBadge = document.querySelector("#status-badge");
const recommendationText = document.querySelector("#freshness-recommendation");
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
const fruitStateEmpty = document.querySelector("#rsEmpty");
const fruitStateFilled = document.querySelector("#rsFruit");
const detectedEmoji = document.querySelector("#detected-emoji-filled");
const detectedFruitName = document.querySelector("#detected-fruit-name-filled");
const confidenceBadge = document.querySelector("#confidence-badge-filled");
const classBars = {
	fresco: [document.querySelector("#bar-fresco"), document.querySelector("#pct-fresco")],
	moderado: [document.querySelector("#bar-moderado"), document.querySelector("#pct-moderado")],
	passado: [document.querySelector("#bar-passado"), document.querySelector("#pct-passado")],
};

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

// Mede as 8 características da casca dentro da área oval
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

	const mask = new ImageData(N, N);
	// Mapa de categorias: 255 = ponto fora da conta (fundo, reflexo ou fora do oval)
	const categoryMap = new Uint8Array(N * N).fill(255);
	const c = (N - 1) / 2;
	const r = (N / 2) * OVAL;
	const count = { viva: 0, marrom: 0, mofo: 0, escuro: 0, apagado: 0 };
	let n = 0;
	let satSum = 0;
	let valSum = 0;
	let texSum = 0;
	let rawValSum = 0;
	let rawCount = 0;

	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			if ((x - c) ** 2 + (y - c) ** 2 > r * r) continue;
			const i = y * N + x;
			const h = hue[i];
			const s = sat[i];
			const v = val[i];
			rawValSum += v;
			rawCount++;

			// Fundo branco ou reflexo de luz, e pixels quase pretos: fora da conta
			if ((v > 0.93 && s < 0.08) || v < 0.06) continue;
			n++;
			satSum += s;
			valSum += v;
			// Textura: diferença de brilho para o vizinho da direita e o de baixo
			if (x < N - 1) texSum += Math.abs(val[i + 1] - v);
			if (y < N - 1) texSum += Math.abs(val[i + N] - v);

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
		brightness: rawCount ? rawValSum / rawCount : 0,
		mask,
		categoryMap,
		counts: count,
	};
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
	return `${partes.join(", ")} e ${casca}. Chance de estar estragada: ${pct(freshness.chance)}%.`;
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
// Painel lateral e painel de resultado
// ---------------------------------------------------------------
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
	const chance = Math.round(freshness.chance * 100);
	scaleMarker.style.left = `${chance}%`;
	scaleMarker.dataset.value = `${chance}%`;
	scaleMarker.classList.toggle("near-start", chance < 8);
	scaleMarker.classList.toggle("near-end", chance > 92);
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

function setConfidence(percent) {
	confidenceValue.textContent = `${percent}%`;
	confidenceBar.style.width = `${percent}%`;
	confidenceTrack.setAttribute("aria-valuenow", percent);
}

function setClassBars(avg) {
	Object.entries(classBars).forEach(([key, [bar, label]]) => {
		const value = avg ? Math.round(avg[key]) : 0;
		bar.style.width = `${value}%`;
		label.textContent = `${value}%`;
	});
}

function resetSidebarState(message = "Aguardando") {
	fruitStateFilled.hidden = true;
	fruitStateEmpty.hidden = false;
	statusBadge.textContent = "Aguardando";
	statusBadge.className = "status-badge neutral";
	recommendationText.textContent = "Tire uma foto de uma fruta";
	confidenceBadge.textContent = "0%";
	setConfidence(0);
	setClassBars(null);
	freshnessReason.textContent = "O motivo do resultado aparece aqui.";
	if (explainPanel) explainPanel.hidden = true;
	if (detectionResult) detectionResult.hidden = true;
	showWarnings([]);
	detectedFruit.textContent = message;
	freshnessStatus.textContent = "Aguardando";
	freshnessStatus.className = "status-fresh";
}

function renderFruitState(fruitKey, freshness, detectionConfidence) {
	const { state, percent, avg } = freshness;
	const fruitName = fruitNames[fruitKey];

	// Resposta direta no topo do resultado
	if (verdict) {
		verdict.className = `verdict ${state.className}`;
		verdictFruit.textContent = `${fruitName} · ${state.label} (${percent}%)`;
		verdictTitle.textContent = VEREDITOS[state.className];
		// Tira o começo da dica quando ele repete o título ("Consuma logo", "Evite consumir")
		const dica = state.tips[fruitKey].replace(/^(Consuma logo|Evite consumir)[.,]\s*/, "");
		verdictTip.textContent = dica.charAt(0).toUpperCase() + dica.slice(1);
	}
	if (detectionResult) detectionResult.hidden = false;

	fruitStateFilled.hidden = false;
	fruitStateEmpty.hidden = true;
	detectedEmoji.src = fruitImages[fruitKey];
	detectedEmoji.alt = fruitName;
	detectedFruitName.textContent = fruitName;
	confidenceBadge.textContent = `${state.label} • ${percent}%`;
	statusBadge.textContent = state.label;
	statusBadge.className = `status-badge ${state.className}`;
	recommendationText.textContent = state.tips[fruitKey];

	detectedFruit.textContent = fruitName;
	freshnessStatus.textContent = state.label;
	freshnessStatus.className = `status-fresh ${state.className}`;
	freshnessReason.textContent = buildReason(freshness);
	setClassBars(avg);
	setConfidence(detectionConfidence ?? 0);
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

function buildCard({ fruitKey, freshness, detectionConfidence, overlay, warning }) {
	const W = 1080;
	const PAD = 60;
	const scale = Math.min(W / photoCanvas.width, 1350 / photoCanvas.height);
	const photoW = Math.round(photoCanvas.width * scale);
	const photoH = Math.round(photoCanvas.height * scale);
	const panelH = 900; // altura máxima; o que sobrar é cortado no fim

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

	const { state, percent, avg } = freshness;
	const stateColor = CARD_COLORS[state.className];
	let y = photoH + 70;

	// Cabeçalho: marca e data
	ctx.fillStyle = CARD_COLORS.fresco;
	ctx.font = serif(30);
	ctx.textAlign = "left";
	ctx.fillText("Fresh Food", PAD, y);
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(26);
	ctx.textAlign = "right";
	ctx.fillText(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), W - PAD, y);

	// Nome da fruta e selo do estado
	y += 90;
	ctx.textAlign = "left";
	ctx.fillStyle = CARD_COLORS.text;
	ctx.font = serif(76);
	const fruitName = fruitNames[fruitKey];
	ctx.fillText(fruitName, PAD, y);
	const nameWidth = ctx.measureText(fruitName).width;

	ctx.font = font(32, 700);
	const pillText = `${state.label.toUpperCase()} • ${percent}%`;
	const pillW = ctx.measureText(pillText).width + 48;
	const pillX = PAD + nameWidth + 32;
	ctx.fillStyle = stateColor;
	ctx.globalAlpha = 0.18;
	roundRect(ctx, pillX, y - 50, pillW, 62, 31);
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.fillStyle = stateColor;
	ctx.fillText(pillText, pillX + 24, y - 8);

	// Barras das três classes
	y += 70;
	const labelX = PAD;
	const trackX = PAD + 200;
	const trackW = W - PAD * 2 - 200 - 110;
	["fresco", "moderado", "passado"].forEach((key) => {
		const value = Math.round(avg[key]);
		ctx.fillStyle = CARD_COLORS.text;
		ctx.font = font(30, 600);
		ctx.textAlign = "left";
		ctx.fillText(statusStates[key].label, labelX, y);

		ctx.fillStyle = CARD_COLORS.track;
		roundRect(ctx, trackX, y - 22, trackW, 20, 10);
		ctx.fill();
		if (value > 0) {
			ctx.fillStyle = CARD_COLORS[key];
			roundRect(ctx, trackX, y - 22, Math.max(20, (trackW * value) / 100), 20, 10);
			ctx.fill();
		}

		ctx.fillStyle = CARD_COLORS.text;
		ctx.font = font(30, 700);
		ctx.textAlign = "right";
		ctx.fillText(`${value}%`, W - PAD, y);
		y += 58;
	});

	// Motivo e dica de uso
	y += 20;
	ctx.textAlign = "left";
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(28);
	y += drawWrappedText(ctx, buildReason(freshness), PAD, y, W - PAD * 2, 40);

	y += 20;
	ctx.fillStyle = CARD_COLORS.text;
	ctx.font = font(32, 600);
	y += drawWrappedText(ctx, state.tips[fruitKey], PAD, y, W - PAD * 2, 44);

	// Rodapé: certeza da detecção, legenda e aviso de luz
	y += 30;
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(24);
	ctx.fillText(detectionConfidence === null ? "Fruta escolhida no botão" : `Certeza de que é ${fruitName.toLowerCase()}: ${detectionConfidence}%`, PAD, y);
	ctx.strokeStyle = CARD_COLORS.accent;
	ctx.lineWidth = 3;
	ctx.textAlign = "right";
	ctx.fillText("Fruta encontrada        Manchas e mofo", W - PAD, y);
	const legendW = ctx.measureText("Fruta encontrada        Manchas e mofo").width;
	const spotsW = ctx.measureText("Manchas e mofo").width;
	ctx.strokeRect(W - PAD - legendW - 30, y - 20, 20, 20);
	ctx.fillStyle = "rgba(255, 64, 64, 0.8)";
	ctx.fillRect(W - PAD - spotsW - 30, y - 20, 20, 20);

	if (warning) {
		y += 50;
		ctx.textAlign = "left";
		ctx.fillStyle = CARD_COLORS.moderado;
		ctx.font = font(26, 600);
		y += drawWrappedText(ctx, warning, PAD, y, W - PAD * 2, 36) - 36;
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

async function analyzePhoto() {
	await ensureDetector();

	// Tempo de cada etapa (para comparar com os 380 ms do FreshNet)
	const t0 = performance.now();
	const predictions = await detectObjects(photoCanvas);
	const t1 = performance.now();
	let prediction = pickPrediction(predictions);
	let manual = false;

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
			resetSidebarState("Nenhuma fruta na foto");
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
	if (manual) warnings.push("A fruta não foi localizada automaticamente: foi analisado o centro da foto.");
	const warning = warnings.filter(Boolean).join(" ") || null;

	renderFruitState(fruitKey, freshness, detectionConfidence);
	showWarnings(warnings.filter(Boolean));

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
			setLiveHint(`${fruitNames[prediction.class]} encontrada! Pode fotografar.`, true);
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

async function startCapture() {
	if (cameraStarted) return;

	if (!navigator.mediaDevices?.getUserMedia) {
		const error = new Error("Câmera não suportada neste navegador.");
		error.name = "NotSupportedError";
		throw error;
	}

	const stream = await navigator.mediaDevices.getUserMedia({
		video: { facingMode: { ideal: "environment" } },
		audio: false,
	});

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

		if (!detectionLoopStarted) {
			window.setInterval(detectLive, 500);
			detectionLoopStarted = true;
		}

		captureButton.disabled = false;
		cameraLock.classList.add("is-hidden");
		cameraFrame?.classList.remove("is-error");
		setLiveHint(`Aponte a câmera para uma ${fruitWanted()}`);
	} catch (error) {
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

function openCameraView() {
	setHomeVisible(false);
	hideResults();
	cameraCard.hidden = false;
	document.body.classList.add("camera-open");
	if (cameraHelp) cameraHelp.hidden = true;
}

// Fecha a câmera e desliga a imagem (economiza bateria)
function closeCameraView() {
	cameraCard.hidden = true;
	document.body.classList.remove("camera-open");
	stopCapture();
}

function stopCapture() {
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

function closeMobileSidebars() {
	leftSidebar?.classList.remove("mobile-open");
	mobileOverlay?.classList.remove("is-visible");
}

// Atenção: ainda falta um botão no HTML que chame esta função
function toggleSidebar(sidebar) {
	const isOpen = sidebar.classList.contains("mobile-open");
	closeMobileSidebars();
	if (!isOpen) {
		sidebar.classList.add("mobile-open");
		mobileOverlay?.classList.add("is-visible");
	}
}

mobileOverlay?.addEventListener("click", closeMobileSidebars);

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		closeMobileSidebars();
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
