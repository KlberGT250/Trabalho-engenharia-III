# Versão 1 das medidas (até a v19 do site), guardada para comparação.
from dados import *
SIDE=160
NAMES=['pVib','pBrown','pMold','pDark','pDull','meanS','meanV','texture']
def features(img, p, ell=0.9):
    im=img.convert('RGB').resize((SIDE,SIDE), Image.BILINEAR)
    h,s,v=hsv(im)
    yy,xx=np.mgrid[0:SIDE,0:SIDE]
    c=(SIDE-1)/2; r=SIDE/2*ell
    inside=((xx-c)**2+(yy-c)**2)<=r*r
    bg=(v>0.93)&(s<0.08)
    keep=inside&~bg&(v>=0.06)
    n=max(1,keep.sum())
    vib=inr(h,p['vH'])&(s>p['vS'])&(v>p['vV'])
    brown=~vib&inr(h,[(0,50),(340,360)])&(s>=0.2)&(v<0.55)
    mold=~vib&~brown&(s<0.2)&(v>=0.3)
    dark=~vib&~brown&(v<0.25)
    dull=~vib&~brown&~mold&~dark
    dx=np.abs(np.diff(v,axis=1))[:, :]; dy=np.abs(np.diff(v,axis=0))
    tx=np.zeros_like(v); tx[:,:-1]+=dx; tx[:-1,:]+=dy
    f=[(vib&keep).sum()/n,(brown&keep).sum()/n,(mold&keep).sum()/n,(dark&keep).sum()/n,(dull&keep).sum()/n,
       s[keep].mean() if keep.any() else 0, v[keep].mean() if keep.any() else 0, tx[keep].mean() if keep.any() else 0]
    return np.array(f,dtype=np.float64)
