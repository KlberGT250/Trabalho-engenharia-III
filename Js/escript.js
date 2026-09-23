const cameraFeed = document.querySelector("#camera-feed");
const detectionCanvas = document.querySelector("#detection-canvas");
const cameraFrame = document.querySelector(".camera-frame");
const cameraLock = document.querySelector("#camera-lock");
const cameraMessage = document.querySelector("#camera-message");
const fruitOptions = document.querySelectorAll(".fruit-option");
const detectedFruit = document.querySelector("#detected-fruit");
const freshnessStatus = document.querySelector("#freshness-status");
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

const fruitData = {
	banana: {
		emoji: "🍌",
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
		emoji: "🍎",
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
		emoji: "🍊",
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
	banana: "./IMG/egas%20(7).png",
	apple: "./IMG/egas%20(3).png",
	orange: "./IMG/egas%20(5).png",
};

const statusStates = {
	fresco: {
		label: "Fresco",
		recommendation: "Consuma nos próximos dias.",
		className: "fresco",
	},
	moderado: {
		label: "Moderado",
		recommendation: "Melhor consumir em breve.",
		className: "moderado",
	},
	passado: {
		label: "Passado",
		recommendation: "Evite consumir este lote.",
		className: "passado",
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

const statusBadge = document.querySelector("#status-badge");
const recommendationText = document.querySelector("#freshness-recommendation");
const nutritionalList = document.querySelector("#nutrition-list");
const nutritionalListMobile = document.querySelector("#nutrition-list-mobile");
const fruitStateEmpty = document.querySelector("#rsEmpty");
const fruitStateFilled = document.querySelector("#rsFruit");
const detectedEmoji = document.querySelector("#detected-emoji-filled");
const detectedFruitName = document.querySelector("#detected-fruit-name-filled");
const confidenceBadge = document.querySelector("#confidence-badge-filled");

// Canvas escondido, só para ler os pixels do vídeo
const frameCanvas = document.createElement("canvas");
const frameContext = frameCanvas.getContext("2d", { willReadFrequently: true });

let detector;
let selectedFruit = null;
let cameraStarted = false;
let detectionInProgress = false;
let detectionLoopStarted = false;
let freshnessHistory = [];
let missCount = 0;

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

// Recebe os pixels da fruta e devolve a porcentagem de fresco/moderado/passado
function computeFreshness(data, perfil) {
	let total = 0;
	let vibrante = 0;
	let marrom = 0;
	let opaco = 0;
	let brightnessSum = 0;

	for (let i = 0; i < data.length; i += 16) { // lê 1 a cada 4 pixels
		const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);

		// Pixel quase preto: sombra ou borda, não mancha. Ignora.
		if (v < 0.06) continue;

		total++;
		brightnessSum += v;

		const isVibrante = inHueRanges(h, perfil.vibranteHue) && s > perfil.vibranteSatMin && v > perfil.vibranteValMin;
		const isMarrom = !isVibrante && inHueRanges(h, perfil.marromHue) && v < perfil.marromValMax && s < perfil.marromSatMax;

		if (isVibrante) vibrante++;
		else if (isMarrom) marrom++;
		else if (s < 0.3 || v < 0.3) opaco++;
	}

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

	const data = frameContext.getImageData(cropX, cropY, cropW, cropH).data;
	return computeFreshness(data, perfil);
}

// Média das últimas leituras e escolha do estado vencedor
function averageFreshness() {
	const n = freshnessHistory.length;
	const avg = { fresco: 0, moderado: 0, passado: 0 };
	freshnessHistory.forEach((r) => {
		avg.fresco += r.fresco / n;
		avg.moderado += r.moderado / n;
		avg.passado += r.passado / n;
	});

	let key = "moderado";
	if (avg.fresco >= avg.moderado && avg.fresco >= avg.passado) key = "fresco";
	else if (avg.passado >= avg.fresco && avg.passado >= avg.moderado) key = "passado";

	return { state: statusStates[key], percent: Math.round(avg[key]) };
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
}

function setConfidence(percent) {
	confidenceValue.textContent = `${percent}%`;
	confidenceBar.style.width = `${percent}%`;
	confidenceTrack.setAttribute("aria-valuenow", percent);
}

function resetSidebarState(message = "Aguardando seleção") {
	fruitStateFilled.hidden = true;
	fruitStateEmpty.hidden = false;
	statusBadge.textContent = "Aguardando";
	statusBadge.className = "status-badge neutral";
	recommendationText.textContent = "Nenhuma fruta detectada ainda";
	confidenceBadge.textContent = "0%";
	setConfidence(0);
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

	const { state, percent } = freshness;
	const fruitName = fruitNames[fruitKey];
	const fruitImage = fruitImages[fruitKey] ?? fruitImages.orange;

	fruitStateFilled.hidden = false;
	fruitStateEmpty.hidden = true;
	detectedEmoji.src = fruitImage;
	detectedEmoji.alt = fruitName;
	detectedFruitName.textContent = fruitName;
	confidenceBadge.textContent = `${state.label} • ${percent}%`;
	statusBadge.textContent = state.label;
	statusBadge.className = `status-badge ${state.className}`;
	recommendationText.textContent = state.recommendation;

	detectedFruit.textContent = fruitName;
	freshnessStatus.textContent = state.label;
	freshnessStatus.className = `status-fresh ${state.className}`;
	setConfidence(detectionConfidence);
	fillNutrition(fruitKey);
}

function clearCanvas() {
	detectionCanvas.getContext("2d").clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
}

function drawPrediction(prediction) {
	const [x, y, width, height] = prediction.bbox;
	const context = detectionCanvas.getContext("2d");
	context.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
	context.strokeStyle = "#3ddc84";
	context.lineWidth = 3;
	context.strokeRect(x, y, width, height);
}

async function detectFruit() {
	if (detectionInProgress || !selectedFruit || !detector || cameraFeed.readyState < 2) {
		return;
	}

	detectionInProgress = true;
	try {
		const predictions = await detector.detect(cameraFeed);
		const fruitPrediction = predictions
			.filter((p) => p.class === selectedFruit)
			.sort((a, b) => b.score - a.score)[0];

		if (fruitPrediction) {
			missCount = 0;
			drawPrediction(fruitPrediction);

			const result = analyzeRegion(selectedFruit, fruitPrediction.bbox);
			if (result) {
				freshnessHistory.push(result);
				if (freshnessHistory.length > HISTORY_SIZE) freshnessHistory.shift();
				const detectionConfidence = Math.round(fruitPrediction.score * 100);
				renderFruitState(selectedFruit, averageFreshness(), detectionConfidence);
			}
		} else {
			missCount++;
			if (missCount >= MAX_MISSES) {
				freshnessHistory = [];
				clearCanvas();
				resetSidebarState(`Procurando ${fruitNames[selectedFruit]}...`);
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
		resetSidebarState(selectedFruit ? fruitNames[selectedFruit] : "Aguardando seleção");
		freshnessStatus.textContent = error.name === "ModelError" ? "Modelo indisponível" : "Câmera indisponível";
	}
}

function selectFruit(fruit) {
	selectedFruit = fruit;
	freshnessHistory = [];
	missCount = 0;

	fruitOptions.forEach((option) => {
		option.setAttribute("aria-pressed", option.dataset.fruit === fruit);
	});

	clearCanvas();
	resetSidebarState(`Procurando ${fruitNames[fruit]}...`);
	startDetection();
}

fruitOptions.forEach((option) => {
	option.addEventListener("click", () => selectFruit(option.dataset.fruit));
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