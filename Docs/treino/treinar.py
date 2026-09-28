from caracteristicas import *
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import json
items=dataset()
X={};Y={};R={}
for it in items:
    f=features(load(it['path'],400),PERFIS[it['fruit']])
    X.setdefault(it['fruit'],[]).append(f); Y.setdefault(it['fruit'],[]).append(it['state']=='rotten'); R.setdefault(it['fruit'],[]).append(it['role'])
np.save('cache.npy',{'X':X,'Y':Y,'R':R},allow_pickle=True)
model={}
tot=ok=0
for fr in X:
    x=np.array(X[fr]); y=np.array(Y[fr]); r=np.array(R[fr])
    cal=r=='calib'; val=~cal
    sc=StandardScaler().fit(x[cal])
    best=None
    for C in [0.03,0.1,0.3,1,3]:
        m=LogisticRegression(C=C,max_iter=2000).fit(sc.transform(x[cal]),y[cal])
        # escolha do C por validação cruzada simples dentro da calibração
        from sklearn.model_selection import cross_val_score
        cv=cross_val_score(LogisticRegression(C=C,max_iter=2000),sc.transform(x[cal]),y[cal],cv=5).mean()
        if best is None or cv>best[0]: best=(cv,C,m)
    cv,C,m=best
    p=m.predict_proba(sc.transform(x[val]))[:,1]
    acc=((p>0.5)==y[val]).mean(); tot+=val.sum(); ok+=((p>0.5)==y[val]).sum()
    print(fr,f"calib n={cal.sum()} (rotten {y[cal].sum()}) C={C} cv={cv:.0%} | VALIDAÇÃO n={val.sum()} acerto={acc:.0%}",
          "frescas ok",((p<=0.5)&~y[val]).sum(),"/",(~y[val]).sum()," estragadas ok",((p>0.5)&y[val]).sum(),"/",y[val].sum())
    model[fr]=dict(mean=sc.mean_.round(6).tolist(),std=sc.scale_.round(6).tolist(),w=m.coef_[0].round(4).tolist(),b=round(float(m.intercept_[0]),4))
    print("   pesos:",dict(zip(NAMES,m.coef_[0].round(2))))
print(f"GERAL validação {ok/tot:.0%} ({ok}/{tot})")
json.dump(model,open('modelo.json','w'))  # copiar os números para MODELO em Js/escript.js
