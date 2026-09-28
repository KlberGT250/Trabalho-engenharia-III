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
// Análise de frescor por cor (HSV)
// Perfis calibrados com o dataset do Kaggle (testar_frescor.py).
// "vibrante" = cor viva da fruta fresca; "marrom" = manchas escuras.
// ---------------------------------------------------------------
const PERFIS = {
	banana: {
		vibranteHue: [[35, 100]], vibranteSatMin: 0.35, vibranteValMin: 0.35,
		marromHue: [[0, 45], [340, 360]], marromValMax: 0.45, marromSatMax: 0.55,
	},
	orange: {
		vibranteHue: [[20, 45]], vibranteSatMin: 0.4, vibranteValMin: 0.35,
		marromHue: [[0, 20], [45, 60]], marromValMax: 0.4, marromSatMax: 0.55,
	},
	apple: {
		vibranteHue: [[0, 15], [345, 360], [70, 130]], vibranteSatMin: 0.35, vibranteValMin: 0.35,
		marromHue: [[20, 50]], marromValMax: 0.4, marromSatMax: 0.55,
	},
};

// Recortes usados na análise da foto (a média deles deixa o resultado mais estável)
const CROP_SIZES = [0.6, 0.72, 0.84];
// Maior lado da foto analisada (fotos de celular são enormes e deixariam tudo lento)
const MAX_PHOTO_SIDE = 1280;
// Quantas leituras sem achar a fruta antes de limpar o resultado
const MAX_MISSES = 3;
// Limites de luz: abaixo ou acima disso o resultado não é confiável
const LIGHT_MIN = 0.22;
const LIGHT_MAX = 0.88;
// Cor usada para pintar as manchas por cima da imagem (RGBA)
const SPOT_COLOR = [255, 64, 64, 170];

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

// Recebe os pixels da fruta e devolve:
// - a porcentagem de fresco/moderado/passado
// - quanto da casca tem cor viva, manchas e partes opacas (o "motivo")
// - o brilho médio (para avisar se a luz está ruim)
// - uma máscara com as manchas, para desenhar por cima do vídeo
function computeFreshness(imageData, perfil) {
	const data = imageData.data;
	const mask = new ImageData(imageData.width, imageData.height);
	let total = 0;
	let vibrante = 0;
	let marrom = 0;
	let opaco = 0;
	let brightnessSum = 0;
	let rawBrightnessSum = 0;

	for (let i = 0; i < data.length; i += 4) {
		const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
		rawBrightnessSum += v;

		// Pixel quase preto: sombra ou borda, não mancha. Ignora.
		if (v < 0.06) continue;

		total++;
		brightnessSum += v;

		const isVibrante = inHueRanges(h, perfil.vibranteHue) && s > perfil.vibranteSatMin && v > perfil.vibranteValMin;
		const isMarrom = !isVibrante && inHueRanges(h, perfil.marromHue) && v < perfil.marromValMax && s < perfil.marromSatMax;

		if (isVibrante) {
			vibrante++;
		} else if (isMarrom) {
			marrom++;
			mask.data[i] = SPOT_COLOR[0];
			mask.data[i + 1] = SPOT_COLOR[1];
			mask.data[i + 2] = SPOT_COLOR[2];
			mask.data[i + 3] = SPOT_COLOR[3];
		} else if (s < 0.3 || v < 0.3) {
			opaco++;
		}
	}

	const pixelCount = data.length / 4 || 1;
	if (total === 0) total = 1;

	const pVibrante = vibrante / total;
	const pMarrom = marrom / total;
	const pOpaco = opaco / total;
	const avgBrightness = brightnessSum / total;

	let freshScore = (pVibrante * 100) - (pMarrom * 90) - (pOpaco * 40) + (avgBrightness * 15);
	freshScore = Math.max(0, Math.min(100, freshScore + 35));
	const staleScore = Math.max(0, Math.min(100, (pMarrom * 130 + pOpaco * 60) - (pVibrante * 20)));
	const modScore = Math.max(0, 100 - freshScore - staleScore);

	const sum = freshScore + modScore + staleScore || 1;
	return {
		fresco: (freshScore / sum) * 100,
		moderado: (modScore / sum) * 100,
		passado: (staleScore / sum) * 100,
		pVibrante,
		pMarrom,
		pOpaco,
		brightness: rawBrightnessSum / pixelCount,
		mask,
	};
}
// Analisa um recorte do centro da caixa que o COCO-SSD achou.
// "size" é quanto da caixa entra no recorte (0.72 = 72%), para pegar menos fundo.
function analyzeRegion(fruitKey, bbox, size) {
	const perfil = PERFIS[fruitKey];
	const pw = photoCanvas.width;
	const ph = photoCanvas.height;
	if (!perfil || !pw || !ph) return null;

	const margin = (1 - size) / 2;
	const [x, y, w, h] = bbox;
	const cropX = Math.max(0, Math.round(x + w * margin));
	const cropY = Math.max(0, Math.round(y + h * margin));
	const cropW = Math.max(1, Math.min(pw - cropX, Math.round(w * size)));
	const cropH = Math.max(1, Math.min(ph - cropY, Math.round(h * size)));

	const imageData = photoContext.getImageData(cropX, cropY, cropW, cropH);
	const result = computeFreshness(imageData, perfil);
	result.cropX = cropX;
	result.cropY = cropY;
	return result;
}

// Média de várias análises e escolha do estado vencedor
function averageFreshness(results) {
	const n = results.length;
	const avg = { fresco: 0, moderado: 0, passado: 0, pVibrante: 0, pMarrom: 0, pOpaco: 0, brightness: 0 };
	results.forEach((r) => {
		Object.keys(avg).forEach((k) => {
			avg[k] += r[k] / n;
		});
	});

	let key = "moderado";
	if (avg.fresco >= avg.moderado && avg.fresco >= avg.passado) key = "fresco";
	else if (avg.passado >= avg.fresco && avg.passado >= avg.moderado) key = "passado";

	return { key, state: statusStates[key], percent: Math.round(avg[key]), avg };
}

// Explica em linguagem simples por que o sistema chegou no resultado
function buildReason(avg) {
	const viva = Math.round(avg.pVibrante * 100);
	const manchas = Math.round(avg.pMarrom * 100);
	const opaca = Math.round(avg.pOpaco * 100);
	return `${viva}% da casca com cor viva, ${manchas}% com manchas escuras e ${opaca}% com cor apagada.`;
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
	freshnessReason.textContent = buildReason(avg);
	setClassBars(avg);
	setConfidence(detectionConfidence);
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
	voiceToggle.textContent = voiceOn ? "🔊 Falar resultado: ligado" : "🔈 Falar resultado: desligado";
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
const CARD_COLORS = {
	background: "#0d1117",
	text: "#ffffff",
	soft: "rgba(255, 255, 255, 0.7)",
	track: "rgba(255, 255, 255, 0.12)",
	accent: "#3ddc84",
	fresco: "#3ddc84",
	moderado: "#f2c94c",
	passado: "#eb5757",
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
function buildOverlay(prediction, analysis) {
	const overlay = document.createElement("canvas");
	overlay.width = photoCanvas.width;
	overlay.height = photoCanvas.height;
	const ctx = overlay.getContext("2d");
	if (analysis?.mask) {
		ctx.putImageData(analysis.mask, analysis.cropX, analysis.cropY);
	}
	const [x, y, w, h] = prediction.bbox;
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
	const font = (size, weight = 400) => `${weight} ${size}px Inter, Arial, sans-serif`;

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
	ctx.fillStyle = CARD_COLORS.accent;
	ctx.font = font(26, 700);
	ctx.textAlign = "left";
	ctx.fillText("FRESH FOOD", PAD, y);
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(26);
	ctx.textAlign = "right";
	ctx.fillText(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), W - PAD, y);

	// Nome da fruta e selo do estado
	y += 90;
	ctx.textAlign = "left";
	ctx.fillStyle = CARD_COLORS.text;
	ctx.font = font(72, 700);
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
	y += drawWrappedText(ctx, buildReason(avg), PAD, y, W - PAD * 2, 40);

	y += 20;
	ctx.fillStyle = CARD_COLORS.text;
	ctx.font = font(32, 600);
	y += drawWrappedText(ctx, state.tips[fruitKey], PAD, y, W - PAD * 2, 44);

	// Rodapé: certeza da detecção, legenda e aviso de luz
	y += 30;
	ctx.fillStyle = CARD_COLORS.soft;
	ctx.font = font(24);
	ctx.fillText(`Certeza de que é ${fruitName.toLowerCase()}: ${detectionConfidence}%`, PAD, y);
	ctx.strokeStyle = CARD_COLORS.accent;
	ctx.lineWidth = 3;
	ctx.textAlign = "right";
	ctx.fillText("Fruta encontrada        Manchas escuras", W - PAD, y);
	const legendW = ctx.measureText("Fruta encontrada        Manchas escuras").width;
	const spotsW = ctx.measureText("Manchas escuras").width;
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

	const predictions = await detector.detect(photoCanvas);
	const prediction = pickPrediction(predictions);

	if (!prediction) {
		resetSidebarState("Nenhuma fruta na foto");
		showNotice(`Não encontrei ${fruitWanted()} na foto. Tente mais perto, com a fruta inteira e um fundo liso.`);
		return;
	}

	const fruitKey = prediction.class;
	const results = CROP_SIZES.map((size) => analyzeRegion(fruitKey, prediction.bbox, size)).filter(Boolean);
	const freshness = averageFreshness(results);
	const detectionConfidence = Math.round(prediction.score * 100);
	const warning = lightMessage(freshness.avg.brightness);

	renderFruitState(fruitKey, freshness, detectionConfidence);

	// A máscara do recorte do meio é a que aparece desenhada na foto
	const overlay = buildOverlay(prediction, results[1] ?? results[0]);
	const card = buildCard({ fruitKey, freshness, detectionConfidence, overlay, warning });
	await showCard(card, fruitKey);

	speak(`${fruitNames[fruitKey]}: ${freshness.state.label}. ${freshness.state.tips[fruitKey]}`);
}

async function runAnalysis(prepare) {
	captureButton.disabled = true;
	galleryButton.disabled = true;
	const oldText = captureButton.textContent;
	captureButton.textContent = "Analisando...";
	try {
		await prepare();
		await analyzePhoto();
	} catch (error) {
		console.error(error);
		showNotice(errorMessages[error.name] ?? "Não foi possível analisar a foto. Tente de novo.");
	} finally {
		captureButton.textContent = oldText;
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
		const predictions = await detector.detect(cameraFeed);
		const prediction = pickPrediction(predictions);

		if (prediction) {
			missCount = 0;
			drawBox(prediction);
			setLiveHint(`${fruitNames[prediction.class]} encontrada. Pode analisar!`, true);
		} else {
			missCount++;
			if (missCount >= MAX_MISSES) {
				clearCanvas();
				setLiveHint(`Procurando ${fruitWanted()}...`);
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

async function ensureDetector() {
	if (detector) return;
	if (typeof cocoSsd === "undefined") {
		const error = new Error("COCO-SSD não carregou");
		error.name = "ModelError";
		throw error;
	}
	cameraMessage.textContent = "Carregando modelo de detecção...";
	detector = await cocoSsd.load();
}

async function startCamera() {
	try {
		await startCapture();
		await ensureDetector();

		if (!detectionLoopStarted) {
			window.setInterval(detectLive, 700);
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
