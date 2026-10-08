# Mede o acerto do modelo com fundos diferentes (usa fundos.py)
# Uso: python avaliar_fundos.py [modelo.json] [caracteristicas_modulo]
import sys, json, importlib
from dados import *
from fundos import FUNDOS, trocar_fundo
arq = sys.argv[1] if len(sys.argv) > 1 else 'modelo.json'
mod = importlib.import_module(sys.argv[2] if len(sys.argv) > 2 else 'caracteristicas')
M = json.load(open(arq))
def chance(f, fr):
    m = M[fr]; z = (f - np.array(m['mean'])) / np.array(m['std'])
    return 1 / (1 + np.exp(-(m['b'] + z @ np.array(m['w']))))
itens = [i for i in dataset() if i['role'] == 'valid']
print(f"{'fundo':12s} " + ' '.join(f"{f:>8s}" for f in ['banana', 'apple', 'orange', 'geral', 'frescas', 'estrag.']))
for fundo in FUNDOS:
    ac = {}; fr_ok = [0, 0]; po_ok = [0, 0]
    for k, it in enumerate(itens):
        im = trocar_fundo(load(it['path'], 400), fundo, k)
        p = chance(mod.features(im, PERFIS[it['fruit']]), it['fruit'])
        certo = (p > 0.5) == (it['state'] == 'rotten')
        ac.setdefault(it['fruit'], []).append(certo)
        (fr_ok if it['state'] == 'fresh' else po_ok)[0] += certo
        (fr_ok if it['state'] == 'fresh' else po_ok)[1] += 1
    tudo = sum(ac.values(), [])
    print(f"{fundo:12s} " + ' '.join(f"{np.mean(ac[f]):8.1%}" for f in ['banana', 'apple', 'orange']) +
          f" {np.mean(tudo):8.1%} {fr_ok[0]/fr_ok[1]:8.1%} {po_ok[0]/po_ok[1]:8.1%}")
