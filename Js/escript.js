const cameraFeed = document.querySelector("#camera-feed");
const detectionCanvas = document.querySelector("#detection-canvas");
const cameraFrame = document.querySelector(".camera-frame");
const cameraLock = document.querySelector("#camera-lock");
const cameraMessage = document.querySelector("#camera-message");
const lightWarning = document.querySelector("#light-warning");
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

// Quantas análises seguidas são usadas na média (evita o resultado "piscar")
const HISTORY_SIZE = 5;
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

// Canvas escondido, só para ler os pixels do vídeo
const frameCanvas = document.createElement("canvas");
const frameContext = frameCanvas.getContext("2d", { willReadFrequently: true });

let detector;
let selectedMode = null; // "auto", "banana", "apple" ou "orange"
let currentFruit = null; // fruta que está sendo analisada agora
let cameraStarted = false;
let detectionInProgress = false;
let detectionLoopStarted = false;
let freshnessHistory = [];
let missCount = 0;
let voiceOn = false;
let lastSpoken = "";

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

// Recorta o centro da caixa que o COCO-SSD achou (72%), para pegar menos fundo
function analyzeRegion(fruitKey, bbox) {
	const perfil = PERFIS[fruitKey];
	const vw = cameraFeed.videoWidth;
	const vh = cameraFeed.videoHeight;
	if (!perfil || !vw || !vh) return null;

	frameCanvas.width = vw;
	frameCanvas.height = vh;
	frameContext.drawImage(cameraFeed, 0, 0, vw, vh);

	const [x, y, w, h] = bbox;
	const cropX = Math.max(0, Math.round(x + w * 0.14));
	const cropY = Math.max(0, Math.round(y + h * 0.14));
	const cropW = Math.max(1, Math.min(vw - cropX, Math.round(w * 0.72)));
	const cropH = Math.max(1, Math.min(vh - cropY, Math.round(h * 0.72)));

	const imageData = frameContext.getImageData(cropX, cropY, cropW, cropH);
	const result = computeFreshness(imageData, perfil);
	result.cropX = cropX;
	result.cropY = cropY;
	return result;
}

// Média das últimas leituras e escolha do estado vencedor
function averageFreshness() {
	const n = freshnessHistory.length;
	const avg = { fresco: 0, moderado: 0, passado: 0, pVibrante: 0, pMarrom: 0, pOpaco: 0 };
	freshnessHistory.forEach((r) => {
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

function showLightWarning(message) {
	lightWarning.hidden = !message;
	lightWarning.textContent = message ?? "";
}

function resetSidebarState(message = "Aguardando") {
	fruitStateFilled.hidden = true;
	fruitStateEmpty.hidden = false;
	statusBadge.textContent = "Aguardando";
	statusBadge.className = "status-badge neutral";
	recommendationText.textContent = "Aponte a câmera para uma fruta";
	confidenceBadge.textContent = "0%";
	setConfidence(0);
	setClassBars(null);
	freshnessReason.textContent = "O motivo do resultado aparece aqui.";
	nutritionBlocks.forEach((block) => { block.hidden = true; });
	showLightWarning(null);
	lastSpoken = "";
	if (detectedFruit) {
		detectedFruit.textContent = message;
	}
	if (freshnessStatus) {
		freshnessStatus.textContent = "Aguardando";
		freshnessStatus.className = "status-fresh";
	}
}

// Só é chamada quando existe uma análise real da imagem
function renderFruitState(fruitKey, freshness, detectionConfidence) {
	if (!fruitData[fruitKey]) return;

	const { state, percent, avg } = freshness;
	const fruitName = fruitNames[fruitKey];
	const recommendation = state.tips[fruitKey];

	fruitStateFilled.hidden = false;
	fruitStateEmpty.hidden = true;
	detectedEmoji.src = fruitImages[fruitKey];
	detectedEmoji.alt = fruitName;
	detectedFruitName.textContent = fruitName;
	confidenceBadge.textContent = `${state.label} • ${percent}%`;
	statusBadge.textContent = state.label;
	statusBadge.className = `status-badge ${state.className}`;
	recommendationText.textContent = recommendation;

	detectedFruit.textContent = fruitName;
	freshnessStatus.textContent = state.label;
	freshnessStatus.className = `status-fresh ${state.className}`;
	freshnessReason.textContent = buildReason(avg);
	setClassBars(avg);
	setConfidence(detectionConfidence);
	fillNutrition(fruitKey);

	// Só fala depois de juntar leituras suficientes, para não falar um resultado instável
	if (freshnessHistory.length >= HISTORY_SIZE) {
		speak(`${fruitName}: ${state.label}. ${recommendation}`);
	}
}

// ---------------------------------------------------------------
// Voz (Web Speech API, funciona offline na maioria dos navegadores)
// ---------------------------------------------------------------
function speak(text) {
	if (!voiceOn || !("speechSynthesis" in window) || text === lastSpoken) return;
	lastSpoken = text;
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
	lastSpoken = "";
	if (!voiceOn) window.speechSynthesis.cancel();
	updateVoiceButton();
});

// ---------------------------------------------------------------
// Desenho por cima do vídeo
// ---------------------------------------------------------------
function clearCanvas() {
	detectionCanvas.getContext("2d").clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
}

function drawPrediction(prediction, analysis) {
	const [x, y, width, height] = prediction.bbox;
	const context = detectionCanvas.getContext("2d");
	context.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);

	// Pinta de vermelho as manchas escuras encontradas na casca
	if (analysis?.mask) {
		context.putImageData(analysis.mask, analysis.cropX, analysis.cropY);
	}

	context.strokeStyle = "#3ddc84";
	context.lineWidth = 3;
	context.strokeRect(x, y, width, height);
}

// Escolhe qual detecção usar: no modo automático, a fruta mais provável entre as três
function pickPrediction(predictions) {
	const allowed = selectedMode === "auto" ? Object.keys(fruitNames) : [selectedMode];
	return predictions
		.filter((p) => allowed.includes(p.class))
		.sort((a, b) => b.score - a.score)[0];
}

function lookingForText() {
	return selectedMode === "auto" ? "Procurando fruta..." : `Procurando ${fruitNames[selectedMode]}...`;
}

async function detectFruit() {
	if (detectionInProgress || !selectedMode || !detector || cameraFeed.readyState < 2) {
		return;
	}

	detectionInProgress = true;
	try {
		const predictions = await detector.detect(cameraFeed);
		const fruitPrediction = pickPrediction(predictions);

		if (!fruitPrediction) {
			missCount++;
			if (missCount >= MAX_MISSES) {
				freshnessHistory = [];
				currentFruit = null;
				clearCanvas();
				resetSidebarState(lookingForText());
			}
			return;
		}

		missCount = 0;

		// Se a fruta mudou (modo automático), começa a média do zero
		if (fruitPrediction.class !== currentFruit) {
			currentFruit = fruitPrediction.class;
			freshnessHistory = [];
			lastSpoken = "";
		}

		const result = analyzeRegion(currentFruit, fruitPrediction.bbox);
		drawPrediction(fruitPrediction, result);
		if (!result) return;

		// Luz ruim: avisa e não usa essa leitura, para não dar resultado errado
		if (result.brightness < LIGHT_MIN) {
			showLightWarning("Pouca luz. Aproxime a fruta de uma janela ou lâmpada.");
			return;
		}
		if (result.brightness > LIGHT_MAX) {
			showLightWarning("Luz forte demais. Tire a fruta do sol direto ou do flash.");
			return;
		}
		showLightWarning(null);

		freshnessHistory.push(result);
		if (freshnessHistory.length > HISTORY_SIZE) freshnessHistory.shift();
		const detectionConfidence = Math.round(fruitPrediction.score * 100);
		renderFruitState(currentFruit, averageFreshness(), detectionConfidence);
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
	NotAllowedError: "Permissão da câmera bloqueada. Clique no cadeado do navegador e permita o acesso.",
	NotReadableError: "A câmera está sendo usada por outro app (Teams, Zoom, WhatsApp...). Feche e tente de novo.",
	NotFoundError: "Nenhuma câmera encontrada neste dispositivo.",
	NotSupportedError: "Este navegador não permite usar a câmera.",
	ModelError: "Não foi possível carregar o modelo de detecção. Verifique sua internet e recarregue a página.",
};

async function startDetection() {
	try {
		await startCapture();

		if (!detector) {
			if (typeof cocoSsd === "undefined") {
				const error = new Error("COCO-SSD não carregou");
				error.name = "ModelError";
				throw error;
			}
			cameraMessage.textContent = "Carregando modelo de detecção...";
			detector = await cocoSsd.load();
		}

		if (!detectionLoopStarted) {
			window.setInterval(detectFruit, 700);
			detectionLoopStarted = true;
		}

		cameraLock.classList.add("is-hidden");
		cameraFrame?.classList.remove("is-error");
	} catch (error) {
		console.error(error);
		cameraFrame?.classList.add("is-error");
		cameraLock.classList.remove("is-hidden");
		cameraMessage.textContent = errorMessages[error.name] ?? "Não foi possível acessar a câmera. Verifique se ela está disponível.";
		resetSidebarState("Aguardando");
		freshnessStatus.textContent = error.name === "ModelError" ? "Modelo indisponível" : "Câmera indisponível";
	}
}

function selectMode(mode) {
	selectedMode = mode;
	currentFruit = null;
	freshnessHistory = [];
	missCount = 0;

	fruitOptions.forEach((option) => {
		option.setAttribute("aria-pressed", option.dataset.fruit === mode);
	});

	clearCanvas();
	resetSidebarState(lookingForText());
	startDetection();
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
