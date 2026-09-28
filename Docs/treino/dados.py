# Leitura do dataset e separação treino/validação por foto original
# (também contém a fórmula ANTIGA do site, em old_score, para comparação)
# Reproduz a análise de cor do site (escript.js) em Python para medir o acerto
import numpy as np, glob, os, random, json
from PIL import Image
PERFIS = {
 'banana': dict(vH=[(35,100)], vS=0.35, vV=0.35, mH=[(0,45),(340,360)], mV=0.45, mS=0.55),
 'orange': dict(vH=[(20,45)], vS=0.4, vV=0.35, mH=[(0,20),(45,60)], mV=0.4, mS=0.55),
 'apple':  dict(vH=[(0,15),(345,360),(70,130)], vS=0.35, vV=0.35, mH=[(20,50)], mV=0.4, mS=0.55),
}
FRUIT = {'apples':'apple','banana':'banana','oranges':'orange'}
def hsv(img):
    a=np.asarray(img.convert('RGB'),dtype=np.float32)/255
    r,g,b=a[...,0],a[...,1],a[...,2]
    mx=a.max(-1); mn=a.min(-1); d=mx-mn
    h=np.zeros_like(mx)
    m=d>0
    rr=m&(mx==r); gg=m&(mx==g)&~rr; bb=m&~rr&~gg
    h[rr]=((g-b)[rr]/d[rr])%6; h[gg]=(b-r)[gg]/d[gg]+2; h[bb]=(r-g)[bb]/d[bb]+4
    h*=60; h[h<0]+=360
    s=np.where(mx>0,d/np.maximum(mx,1e-9),0)
    return h,s,mx
def inr(h,rs):
    o=np.zeros(h.shape,bool)
    for lo,hi in rs: o|=(h>=lo)&(h<=hi)
    return o
def load(path, maxside=320):
    im=Image.open(path); im.thumbnail((maxside,maxside)); return im
def crop(h,s,v,size):
    H,W=h.shape; m=(1-size)/2
    y0,x0=int(H*m),int(W*m); y1,x1=y0+max(1,int(H*size)),x0+max(1,int(W*size))
    return h[y0:y1,x0:x1],s[y0:y1,x0:x1],v[y0:y1,x0:x1]
def old_score(h,s,v,p):
    keep=v>=0.06; tot=max(1,keep.sum())
    vib=inr(h,p['vH'])&(s>p['vS'])&(v>p['vV'])
    mar=~vib&inr(h,p['mH'])&(v<p['mV'])&(s<p['mS'])
    opa=~vib&~mar&((s<0.3)|(v<0.3))
    pV=(vib&keep).sum()/tot; pM=(mar&keep).sum()/tot; pO=(opa&keep).sum()/tot; br=v[keep].mean() if keep.any() else 0
    fs=np.clip(pV*100-pM*90-pO*40+br*15+35,0,100); st=np.clip(pM*130+pO*60-pV*20,0,100); md=max(0,100-fs-st); S=fs+md+st or 1
    return np.array([fs/S,md/S,st/S])
def dataset():
    base='Datasets'  # pasta do dataset Kaggle 'Fruits fresh and rotten for classification'
    items=[]
    for split in ['train','test']:
        for d in glob.glob(f'{base}/{split}/*'):
            cls=os.path.basename(d); state='fresh' if cls.startswith('fresh') else 'rotten'
            fruit=FRUIT[cls.replace('fresh','').replace('rotten','')]
            for f in sorted(glob.glob(d+'/*')): items.append(dict(path=f,split=split,state=state,fruit=fruit))
    # Separa por foto ORIGINAL: cópias giradas/espelhadas da mesma fruta ficam sempre do mesmo lado
    import hashlib, re
    ok=[]
    for it in items:
        try:
            Image.open(it['path']).verify()
        except Exception:
            continue
        base=os.path.basename(it['path'])
        base=re.sub(r'^((rotated_by_\d+_|translation_|vertical_flip_|saltandpepper_|horizontal_flip_)+)','',base)
        it['group']=it['fruit']+it['state']+base
        hv=int(hashlib.md5(it['group'].encode()).hexdigest(),16)%100
        it['role']='valid' if hv<40 else 'calib'
        ok.append(it)
    return ok
