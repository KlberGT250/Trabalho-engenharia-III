# Maçã ou laranja? Classificador simples pela cor da casca.
# O COCO-SSD às vezes chama maçã amarelada de laranja (e o contrário).
# Aqui a gente olha só a cor dos pontos da fruta (sem o fundo) e calcula a chance de ser laranja.
from caracteristicas import *
from caracteristicas import _xx, _yy, _c
BINS = 12  # faixas de matiz de 30 graus

def medidas_cor(img, ell=0.9):
    im = img.convert('RGB').resize((SIDE, SIDE), Image.BILINEAR)
    a = np.asarray(im, dtype=np.float32) / 255
    h, s, v = hsv(im)
    inside = ((_xx - _c) ** 2 + (_yy - _c) ** 2) <= (SIDE / 2 * ell) ** 2
    keep = inside & ~((v > 0.93) & (s < 0.08)) & ~mascara_fundo(a, ell) & (v >= 0.06)
    n = max(1, keep.sum())
    colorido = keep & (s >= 0.2) & (v >= 0.2)
    faixa = np.minimum((h / 30).astype(int), BINS - 1)
    hist = np.bincount(faixa[colorido], minlength=BINS) / n
    return np.concatenate([hist, [(keep & ~colorido).sum() / n,
                                  s[keep].mean() if keep.any() else 0, v[keep].mean() if keep.any() else 0]])
