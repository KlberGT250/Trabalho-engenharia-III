from dados import *
from scipy import ndimage
SIDE=160  # a região da fruta é redimensionada para 160x160 (igual no site)
NAMES=['pVib','pBrown','pMold','pDark','pDull','meanS','meanV','texture']

# ---------------------------------------------------------------
# Separar o fundo (v2, outubro/2026)
# A caixa do detector é um retângulo, então os cantos quase sempre são fundo.
# 1) Pega as cores dos cantos e resume em até 3 cores (k-means).
# 2) Marca como fundo os pontos parecidos com essas cores que estão LIGADOS à borda.
#    Uma mancha escura no meio da fruta não está ligada à borda, então continua contando.
# (Testamos também descartar as cores que aparecem no meio da caixa, mas isso atrapalhava
#  a banana: o meio da caixa dela, por dentro da curva, costuma ser fundo.)
# ---------------------------------------------------------------
K_FUNDO=3
LIMITE_COR=0.13     # distância de cor (RGB de 0 a 1) para ser "parecido com o fundo"
FUNDO_MAX=0.6       # se o fundo ocupar mais de 60% do oval, algo deu errado: não remove nada

_yy,_xx=np.mgrid[0:SIDE,0:SIDE]
_c=(SIDE-1)/2
_d=np.sqrt((_xx-_c)**2+(_yy-_c)**2)

def kmeans(px,k,iters=8):
    # começo fixo (igual no site): pontos em ordem de brilho
    ordem=np.argsort(px.sum(1),kind='stable')
    cent=np.array([px[ordem[int((j+0.5)/k*len(px))]] for j in range(k)])
    for _ in range(iters):
        dist=((px[:,None,:]-cent[None])**2).sum(-1)
        lab=dist.argmin(1)
        for j in range(k):
            if (lab==j).any(): cent[j]=px[lab==j].mean(0)
    dist=((px[:,None,:]-cent[None])**2).sum(-1); lab=dist.argmin(1)
    return cent,lab

def mascara_fundo(a, ell=0.9):
    """a: imagem 160x160x3 em 0..1. Devolve True onde é fundo ligado à borda."""
    canto=_d>SIDE/2
    px=a[canto][::2]
    cent,lab=kmeans(px,K_FUNDO)
    # cores que quase não aparecem nos cantos (menos de 10%) não contam
    cores=[cent[j] for j in range(K_FUNDO) if (lab==j).mean()>=0.1]
    if not cores: return np.zeros((SIDE,SIDE),bool)
    dist=np.min([np.sqrt(((a-c)**2).sum(-1)) for c in cores],axis=0)
    parecido=dist<LIMITE_COR
    rot,_=ndimage.label(parecido)  # vizinhos de 4 lados
    sementes=np.unique(rot[parecido&(_d>SIDE/2*ell)])
    fundo=np.isin(rot,sementes[sementes>0])
    oval=_d<=SIDE/2*ell
    if (fundo&oval).sum()>FUNDO_MAX*oval.sum(): return np.zeros((SIDE,SIDE),bool)
    return fundo

def features(img, p, ell=0.9, separar_fundo=True, devolver_mascara=False):
    im=img.convert('RGB').resize((SIDE,SIDE), Image.BILINEAR)
    a=np.asarray(im,dtype=np.float32)/255
    h,s,v=hsv(im)
    inside=((_xx-_c)**2+(_yy-_c)**2)<=(SIDE/2*ell)**2
    bg=(v>0.93)&(s<0.08)
    fundo=mascara_fundo(a,ell) if separar_fundo else np.zeros_like(bg)
    keep=inside&~bg&~fundo&(v>=0.06)
    n=max(1,keep.sum())
    vib=inr(h,p['vH'])&(s>p['vS'])&(v>p['vV'])
    brown=~vib&inr(h,[(0,50),(340,360)])&(s>=0.2)&(v<0.55)
    mold=~vib&~brown&(s<0.2)&(v>=0.3)
    dark=~vib&~brown&(v<0.25)
    dull=~vib&~brown&~mold&~dark
    # textura: diferença de brilho para o vizinho da direita e o de baixo, só entre pontos da fruta
    tx=np.zeros_like(v)
    dx=np.abs(np.diff(v,axis=1))*(keep[:,1:]); dy=np.abs(np.diff(v,axis=0))*(keep[1:,:])
    tx[:,:-1]+=dx; tx[:-1,:]+=dy
    f=[(vib&keep).sum()/n,(brown&keep).sum()/n,(mold&keep).sum()/n,(dark&keep).sum()/n,(dull&keep).sum()/n,
       s[keep].mean() if keep.any() else 0, v[keep].mean() if keep.any() else 0, tx[keep].mean() if keep.any() else 0]
    f=np.array(f,dtype=np.float64)
    return (f,fundo) if devolver_mascara else f
