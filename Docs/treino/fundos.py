# Fundos de teste: troca o fundo branco das fotos do dataset por outros fundos
# (madeira, pano escuro, mesa cinza, pano verde, bege) para ver como o modelo se sai
# fora do fundo branco. Os fundos são gerados por código, com textura e ruído.
import numpy as np
from PIL import Image
from scipy import ndimage

FUNDOS = ['branco', 'madeira', 'pano_escuro', 'cinza', 'verde', 'bege']


def textura(nome, h, w, seed=0):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ruido = rng.normal(0, 1, (h, w)).astype(np.float32)
    ruido_suave = ndimage.gaussian_filter(rng.normal(0, 1, (h, w)), 6).astype(np.float32)
    ruido_suave /= ruido_suave.std() + 1e-6
    if nome == 'madeira':
        veio = np.sin(yy / 7 + 2.5 * ruido_suave) * 0.5 + 0.5
        base = np.array([120, 82, 50], np.float32)
        img = base * (0.75 + 0.35 * veio[..., None]) + ruido[..., None] * 5
    elif nome == 'pano_escuro':
        trama = (np.sin(xx * 1.3) * np.sin(yy * 1.3)) * 4
        img = np.array([38, 38, 44], np.float32) + (trama + ruido * 4 + ruido_suave * 5)[..., None]
    elif nome == 'cinza':
        img = np.array([150, 150, 148], np.float32) + (ruido * 4 + ruido_suave * 8)[..., None]
    elif nome == 'verde':
        img = np.array([62, 108, 64], np.float32) + (ruido * 5 + ruido_suave * 8)[..., None]
    elif nome == 'bege':
        img = np.array([206, 190, 160], np.float32) + (ruido * 3 + ruido_suave * 6)[..., None]
    else:
        return None
    # luz um pouco mais forte num canto, como numa foto real
    luz = 0.85 + 0.25 * (1 - (yy / h + xx / w) / 2)
    return np.clip(img * luz[..., None], 0, 255)


def mascara_fundo(img):
    """Fundo branco ligado à borda da foto (True = fundo)."""
    a = np.asarray(img.convert('RGB'), np.float32) / 255
    mx = a.max(-1); mn = a.min(-1)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    branco = (mx > 0.88) & (s < 0.12)
    rot, _ = ndimage.label(branco)
    borda = np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))
    fundo = np.isin(rot, borda[borda > 0])
    # alisa a borda da fruta
    return ndimage.binary_opening(fundo, iterations=1)


def trocar_fundo(img, nome, seed=0):
    if nome == 'branco':
        return img.convert('RGB')
    a = np.asarray(img.convert('RGB'), np.float32)
    m = mascara_fundo(img).astype(np.float32)
    m = ndimage.gaussian_filter(m, 0.8)[..., None]
    t = textura(nome, a.shape[0], a.shape[1], seed)
    # sombra suave da fruta no fundo
    sombra = ndimage.gaussian_filter(1 - mascara_fundo(img).astype(np.float32), 8)
    sombra = np.roll(sombra, (6, 6), (0, 1))[..., None]
    t = t * (1 - 0.35 * sombra)
    out = a * (1 - m) + t * m
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
