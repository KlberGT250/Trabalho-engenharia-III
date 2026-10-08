# Treina o classificador "maçã ou laranja pela cor" (cor_fruta.py) e gera cor_fruta.json.
# No site ele NÃO troca a fruta sozinho: só mostra um aviso quando a cor discorda
# do detector com chance de 90% ou mais (copiar os números para COR_FRUTA no Js/escript.js).
from cor_fruta import *
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import json
itens = [i for i in dataset() if i['fruit'] in ('apple', 'orange')]
X = {'calib': [], 'valid': []}; Y = {'calib': [], 'valid': []}
for it in itens:
    X[it['role']].append(medidas_cor(load(it['path'], 400))); Y[it['role']].append(it['fruit'] == 'orange')
Xc, yc, Xv, yv = map(np.array, (X['calib'], Y['calib'], X['valid'], Y['valid']))
sc = StandardScaler().fit(Xc)
m = LogisticRegression(C=1, max_iter=3000).fit(sc.transform(Xc), yc)
p = m.predict_proba(sc.transform(Xv))[:, 1]
print(f"acerto maçã x laranja na validação: {((p > 0.5) == yv).mean():.1%}")
outra = np.where(yv, 1 - p, p)  # chance que a cor dá para a OUTRA fruta
print(f"aviso indevido (detector certo, cor discorda com 90%+): {(outra >= 0.9).mean():.1%}")
print(f"aviso certo (se o detector trocar a fruta): {(np.where(yv, p, 1 - p) >= 0.9).mean():.1%}")
json.dump(dict(media=sc.mean_.round(6).tolist(), desvio=sc.scale_.round(6).tolist(),
               pesos=m.coef_[0].round(4).tolist(), base=round(float(m.intercept_[0]), 4)), open('cor_fruta.json', 'w'))
