# Métricas completas do classificador (como na Tabela II do artigo FreshNet)
# e calibração dos dois avisos de confiabilidade do site:
#   1) foto tremida (nitidez pela variância do Laplaciano)
#   2) foto fora do padrão (distância de Mahalanobis até as fotos de calibração),
#      versão simples da "detecção de anomalia" do FreshNet, que lá usa um autoencoder
#
# Usa o modelo já treinado (modelo.json), sem treinar de novo.
# Gera metricas.json e anomalia.json (copiar os números para o Js/escript.js).
from caracteristicas import *
from PIL import ImageFilter
import json, time

M = json.load(open('modelo.json'))
FRUTAS = ['banana', 'apple', 'orange']
NOME = {'banana': 'Banana', 'apple': 'Maçã', 'orange': 'Laranja'}

# Nitidez: mesma conta do site (cinza, 256x256, Laplaciano de 4 vizinhos, só dentro do oval)
LADO_NITIDEZ = 256
def nitidez(img):
    g = np.asarray(img.convert('L').resize((LADO_NITIDEZ, LADO_NITIDEZ), Image.BILINEAR), dtype=np.float32)
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    yy, xx = np.mgrid[1:LADO_NITIDEZ - 1, 1:LADO_NITIDEZ - 1]
    c = (LADO_NITIDEZ - 1) / 2; r = LADO_NITIDEZ / 2 * 0.9
    dentro = ((xx - c) ** 2 + (yy - c) ** 2) <= r * r
    keep = dentro & ~(g[1:-1, 1:-1] > 237)
    return float(lap[keep].var()) if keep.sum() > 100 else 0.0

def padronizar(f, fr):
    m = M[fr]
    return (f - np.array(m['mean'])) / np.array(m['std'])

def chance(f, fr):
    m = M[fr]
    return 1 / (1 + np.exp(-(m['b'] + padronizar(f, fr) @ np.array(m['w']))))

def estado(p):
    return 'Fresco' if p < 0.4 else ('Passado' if p > 0.7 else 'Moderado')

items = dataset()
linhas = []
for it in items:
    im = load(it['path'], 400)
    linhas.append(dict(it, f=features(im, PERFIS[it['fruit']]), nit=nitidez(im),
                       nit_borrada=nitidez(im.filter(ImageFilter.GaussianBlur(2)))))

def metricas(y, pred):
    # y e pred: True = estragada
    vp = int((pred & y).sum()); fp = int((pred & ~y).sum()); fn = int((~pred & y).sum()); vn = int((~pred & ~y).sum())
    prec = vp / max(1, vp + fp); rec = vp / max(1, vp + fn); f1 = 2 * prec * rec / max(1e-9, prec + rec)
    # mesma conta para a classe "fresca" e média das duas (macro), como no artigo
    prec_f = vn / max(1, vn + fn); rec_f = vn / max(1, vn + fp); f1_f = 2 * prec_f * rec_f / max(1e-9, prec_f + rec_f)
    return dict(n=len(y), acuracia=(vp + vn) / len(y), precisao=(prec + prec_f) / 2, recall=(rec + rec_f) / 2,
                f1=(f1 + f1_f) / 2, matriz=dict(fresca_ok=vn, fresca_erro=fp, estragada_erro=fn, estragada_ok=vp))

resultado = {}
anomalia = {}
for fr in FRUTAS + ['geral']:
    R = [r for r in linhas if r['role'] == 'valid' and (fr == 'geral' or r['fruit'] == fr)]
    y = np.array([r['state'] == 'rotten' for r in R])
    p = np.array([chance(r['f'], r['fruit']) for r in R])
    met = metricas(y, p > 0.5)
    # tabela em 3 estados: real (fresca/estragada) x previsto (Fresco/Moderado/Passado)
    tres = {real: {e: 0 for e in ['Fresco', 'Moderado', 'Passado']} for real in ['fresca', 'estragada']}
    for yy, pp in zip(y, p):
        tres['estragada' if yy else 'fresca'][estado(pp)] += 1
    met['tres_estados'] = tres
    resultado[fr] = met

# Detecção de anomalia: covariância das medidas (padronizadas) das fotos de calibração
for fr in FRUTAS:
    Z = np.array([padronizar(r['f'], fr) for r in linhas if r['fruit'] == fr and r['role'] == 'calib'])
    inv = np.linalg.inv(np.cov(Z.T) + np.eye(8) * 0.05)
    d = np.sqrt(np.einsum('ij,jk,ik->i', Z, inv, Z))
    limite = float(np.percentile(d, 97.5))  # 2,5% das fotos normais passam do limite
    anomalia[fr] = dict(inversa=inv.round(5).tolist(), limite=round(limite, 3))

# Quanto o aviso pega quando a fruta escolhida está errada (ex.: maçã analisada como banana)
import random
random.seed(1)
fora = {}
for fr in FRUTAS:
    outras = [r for r in linhas if r['fruit'] != fr and r['role'] == 'valid']
    random.shuffle(outras)
    inv = np.array(anomalia[fr]['inversa'])
    marcadas = 0
    for r in outras[:80]:
        z = padronizar(features(load(r['path'], 400), PERFIS[fr]), fr)
        marcadas += np.sqrt(z @ inv @ z) > anomalia[fr]['limite']
    fora[fr] = marcadas / 80

normais = [r for r in linhas if r['role'] == 'valid']
inv_cache = {fr: np.array(anomalia[fr]['inversa']) for fr in FRUTAS}
marcadas_normais = np.mean([np.sqrt(padronizar(r['f'], r['fruit']) @ inv_cache[r['fruit']] @ padronizar(r['f'], r['fruit']))
                            > anomalia[r['fruit']]['limite'] for r in normais])

LIMITE_NITIDEZ = 12
nit = np.array([r['nit'] for r in linhas]); nit_b = np.array([r['nit_borrada'] for r in linhas])
resultado['avisos'] = dict(
    limite_nitidez=LIMITE_NITIDEZ,
    fotos_nitidas_marcadas=float((nit < LIMITE_NITIDEZ).mean()),
    fotos_borradas_marcadas=float((nit_b < LIMITE_NITIDEZ).mean()),
    fora_padrao_fotos_normais=float(marcadas_normais),
    fora_padrao_fruta_errada={fr: float(v) for fr, v in fora.items()},
)

json.dump(resultado, open('metricas.json', 'w'), ensure_ascii=False, indent=1)
json.dump(anomalia, open('anomalia.json', 'w'))

for fr in FRUTAS + ['geral']:
    m = resultado[fr]
    print(f"{NOME.get(fr, 'Geral'):8} n={m['n']:3}  acurácia {m['acuracia']:.1%}  precisão {m['precisao']:.1%}  "
          f"recall {m['recall']:.1%}  F1 {m['f1']:.1%}  matriz {m['matriz']}  3 estados {m['tres_estados']}")
print('avisos', json.dumps(resultado['avisos'], ensure_ascii=False))
