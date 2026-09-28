from dados import *
items=dataset()
res={}
for it in items:
    if it['role']!='valid': continue
    h,s,v=hsv(load(it['path']))
    sc=np.mean([old_score(*crop(h,s,v,c),PERFIS[it['fruit']]) for c in (0.6,0.72,0.84)],0)
    pred=['fresco','moderado','passado'][int(np.argmax(sc))]
    res.setdefault(it['fruit'],[]).append((it['state'],pred))
tot=ok=0
for f,v in res.items():
    fr=[p for s,p in v if s=='fresh']; ro=[p for s,p in v if s=='rotten']
    a=sum(p=='fresco' for p in fr)+sum(p!='fresco' for p in ro)
    tot+=len(v); ok+=a
    print(f, f"n={len(v)} acerto={a/len(v):.0%} | frescas->fresco {sum(p=='fresco' for p in fr)}/{len(fr)} | estragadas->passado {sum(p=='passado' for p in ro)}/{len(ro)}, ->moderado {sum(p=='moderado' for p in ro)}")
print(f"GERAL {ok/tot:.0%} ({ok}/{tot})")
