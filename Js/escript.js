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
const voiceToggle = document.querySelector("#voice-toggle");
const leftSidebar = document.querySelector(".sidebar-left");
const mobileOverlay = document.querySelector(".mobile-shell-overlay");

const fruitNames = {
	apple: "Maçã",
	banana: "Banana",
	orange: "Laranja",
};

const fruitData = {
	banana: {
		nutrition: {
			Calorias: "89 kcal",
			"Carboidratos": "22.8 g",
			"Proteínas": "1.1 g",
			"Fibras": "2.6 g",
			"Vitamina C": "8.7 mg",
			"Potássio": "358 mg",
		},
	},
	apple: {
		nutrition: {
			Calorias: "52 kcal",
			"Carboidratos": "13.8 g",
			"Proteínas": "0.3 g",
			"Fibras": "2.4 g",
			"Vitamina C": "4.6 mg",
			"Potássio": "107 mg",
		},
	},
	orange: {
		nutrition: {
			Calorias: "47 kcal",
			"Carboidratos": "11.8 g",
			"Proteínas": "0.9 g",
			"Fibras": "2.4 g",
			"Vitamina C": "53.2 mg",
			"Potássio": "181 mg",
		},
	},
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
// Cor usada para pintar os defeitos por cima da imagem (RGBA)
const SPOT_COLOR = [255, 64, 64, 115];

const statusBadge = document.querySelector("#status-badge");
const recommendationText = document.querySelector("#freshness-recommendation");
const nutritionBlocks = [document.querySelector("#nutrition-block"), document.querySelector("#nutrition-block-mobile")].filter(Boolean);
const nutritionalList = document.querySelector("#nutrition-list");
const nutritionalListMobile = document.querySelector("#nutrition-list-mobile");
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
let voiceOn = false;

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
			let defeito = false;
			if (isViva) count.viva++;
			else if (inHueRanges(h, [[0, 50], [340, 360]]) && s >= 0.2 && v < 0.55) { count.marrom++; defeito = true; }
			else if (s < 0.2 && v >= 0.3) { count.mofo++; defeito = true; }
			else if (v < 0.25) { count.escuro++; defeito = true; }
			else count.apagado++;

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

// Analisa a fruta dentro da caixa encontrada pelo COCO-SSD
function analyzeFruit(fruitKey, bbox) {
	const measured = measureFruit(shrinkRegion(bbox), fruitKey);
	const chance = rottenChance(measured.features, fruitKey);
	const freshness = freshnessFromChance(chance);
	freshness.features = measured.features;
	freshness.fruitKey = fruitKey;
	freshness.avg.brightness = measured.brightness;
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

function lightMessage(brightness) {
	if (brightness < LIGHT_MIN) return "Atenção: pouca luz na foto, o resultado pode não ser confiável.";
	if (brightness > LIGHT_MAX) return "Atenção: luz forte demais na foto, o resultado pode não ser confiável.";
	return null;
}

// ---------------------------------------------------------------
// Painel lateral e painel de resultado
// ---------------------------------------------------------------
function fillNutrition(fruitKey) {
	const nutrition = fruitData[fruitKey]?.nutrition ?? fruitData.orange.nutrition;
	const lists = [nutritionalList, nutritionalListMobile].filter(Boolean);

	lists.forEach((list) => {
		list.innerHTML = "";
		Object.entries(nutrition).forEach(([label, value]) => {
			const item = document.createElement("li");
			item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
			list.appendChild(item);
		});
	});
	nutritionBlocks.forEach((block) => { block.hidden = false; });
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
	nutritionBlocks.forEach((block) => { block.hidden = true; });
	detectedFruit.textContent = message;
	freshnessStatus.textContent = "Aguardando";
	freshnessStatus.className = "status-fresh";
}

function renderFruitState(fruitKey, freshness, detectionConfidence) {
	const { state, percent, avg } = freshness;
	const fruitName = fruitNames[fruitKey];

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
	fillNutrition(fruitKey);
}

// ---------------------------------------------------------------
// Voz (Web Speech API, funciona offline na maioria dos navegadores)
// ---------------------------------------------------------------
function speak(text) {
	if (!voiceOn || !("speechSynthesis" in window)) return;
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = "pt-BR";
	const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
	if (voice) utterance.voice = voice;
	window.speechSynthesis.speak(utterance);
}

function updateVoiceButton() {
	voiceToggle.setAttribute("aria-pressed", voiceOn);
	const voiceLabel = voiceToggle.querySelector(".voice-label");
	(voiceLabel ?? voiceToggle).textContent = voiceOn ? "Falar resultado: ligado" : "Falar resultado: desligado";
}

if (!("speechSynthesis" in window)) {
	voiceToggle.hidden = true;
}

voiceToggle.addEventListener("click", () => {
	voiceOn = !voiceOn;
	if (!voiceOn) window.speechSynthesis.cancel();
	updateVoiceButton();
});

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
	lastCardBlob = blob;
	const today = new Date().toISOString().slice(0, 10);
	lastCardName = `fresh-food-${fruitNames[fruitKey].toLowerCase().replace("ç", "c").replace("ã", "a")}-${today}.png`;

	if (resultCard.src.startsWith("blob:")) URL.revokeObjectURL(resultCard.src);
	resultCard.src = URL.createObjectURL(blob);

	// Só mostra "Compartilhar" se o aparelho souber compartilhar imagens
	const file = new File([blob], lastCardName, { type: "image/png" });
	shareButton.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));

	showingResult = true;
	cameraCard.hidden = true;
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
	const file = new File([lastCardBlob], lastCardName, { type: "image/png" });
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
	cameraCard.hidden = false;
	clearCanvas();
	window.speechSynthesis?.cancel();
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
	cameraLock.classList.remove("is-hidden");
	cameraMessage.textContent = message;
	window.clearTimeout(noticeTimer);
	if (cameraStarted) {
		noticeTimer = window.setTimeout(() => cameraLock.classList.add("is-hidden"), 3500);
	}
}

async function analyzePhoto() {
	await ensureDetector();

	const predictions = await detectObjects(photoCanvas);
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
			showNotice(`Não encontrei ${fruitWanted()} na foto. Tente mais perto, com a fruta inteira e um fundo liso, ou escolha a fruta nos botões.`);
			return;
		}
	}

	const fruitKey = prediction.class;
	const { freshness, mask } = analyzeFruit(fruitKey, prediction.bbox);
	const detectionConfidence = manual ? null : Math.round(prediction.score * 100);
	const warnings = [lightMessage(freshness.avg.brightness)];
	if (manual) warnings.push("A fruta não foi localizada automaticamente: foi analisado o centro da foto.");
	const warning = warnings.filter(Boolean).join(" ") || null;

	renderFruitState(fruitKey, freshness, detectionConfidence);

	// Caixa verde e defeitos pintados de vermelho por cima da foto
	const overlay = buildOverlay(prediction, mask);
	const card = buildCard({ fruitKey, freshness, detectionConfidence, overlay, warning });
	await showCard(card, fruitKey);

	speak(`${fruitNames[fruitKey]}: ${freshness.state.label}. ${freshness.state.tips[fruitKey]}`);
}

async function runAnalysis(prepare) {
	captureButton.disabled = true;
	galleryButton.disabled = true;
	const oldText = captureButton.innerHTML;
	captureButton.textContent = "Analisando...";
	try {
		await prepare();
		await analyzePhoto();
	} catch (error) {
		console.error(error);
		showNotice(errorMessages[error.name] ?? "Não foi possível analisar a foto. Tente de novo.");
	} finally {
		captureButton.innerHTML = oldText;
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
			setLiveHint(`${fruitNames[prediction.class]} encontrada. Pode analisar!`, true);
		} else {
			missCount++;
			if (missCount >= MAX_MISSES) {
				clearCanvas();
				const dica = selectedMode === "auto" && missCount >= MAX_MISSES * 3 ? " Dica: escolha a fruta nos botões." : "";
				const dicaManual = selectedMode !== "auto" && missCount >= MAX_MISSES * 3 ? " Pode analisar mesmo assim." : "";
				setLiveHint(`Procurando ${fruitWanted()}...${dica}${dicaManual}`, Boolean(dicaManual));
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
		setLiveHint(`Procurando ${fruitWanted()}...`);
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

	// Se estava vendo um resultado, volta para a câmera
	if (showingResult) newPhotoButton.click();
	if (cameraStarted) setLiveHint(`Procurando ${fruitWanted()}...`);
	startCamera();
}

fruitOptions.forEach((option) => {
	option.addEventListener("click", () => selectMode(option.dataset.fruit));
});

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
	}
});
