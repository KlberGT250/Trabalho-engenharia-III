# Fresh Food: documentação de implementação (v2)

Atualizado em outubro de 2026. Substitui a versão 1.1, que descrevia o protótipo antigo (tema escuro, barras laterais e resultados sorteados).

Site no ar: https://trabalho-engenharia-iii.vercel.app

---

## 1. Visão geral

O Fresh Food é uma página web que fotografa uma **banana**, uma **maçã** ou uma **laranja** e responde se a fruta está **fresca**, **moderada** ou **passada**, dizendo de forma direta se ela **pode ser consumida**.

Tudo roda no navegador do próprio aparelho:

- não existe servidor nem login;
- as fotos não saem do celular;
- depois da primeira visita, funciona **sem internet**;
- pode ser **instalado** na tela inicial como um app.

### O que mudou em relação à v1.1

| v1.1 (protótipo) | v2 (atual) |
|---|---|
| Tema escuro com verde neon | Tema claro "banca de feira": creme, verde-folha e amarelo-banana |
| Duas barras laterais | Sem barras laterais; cabeçalho com as frutas em círculos |
| Câmera fixa no meio da tela | Cartão de 3 passos; a câmera abre em tela cheia |
| Frescor e certeza sorteados | Análise real: 8 medidas da casca e regressão logística |
| Tabela nutricional fixa | Resposta "Pode consumir?" e painel "Por que deu esse resultado" |
| Sem histórico | Histórico das últimas 12 análises, guardado no celular |
| Dependia da internet | Funciona sem internet (service worker) |
| Só celular | Versão própria para computador |

---

## 2. Como o sistema decide

```
Foto ─► Achar a fruta ─► Recorte ─► 8 medidas ─► Classificador ─► Resultado
        (COCO-SSD)       160×160     da casca     (regressão       e resposta
                         área oval                logística)       "pode consumir?"
```

### 2.1 Achar a fruta (detecção de objetos)

- Método: **SSD (Single Shot MultiBox Detector) com MobileNetV2**, versão leve SSDLite, pela biblioteca **COCO-SSD** do TensorFlow.js.
- Modelo **pré-treinado** no conjunto de imagens COCO, que já reconhece banana, maçã e laranja. Por isso a equipe não precisou anotar imagens nem treinar um detector.
- Aceita a detecção a partir de **25%** de certeza (`DETECT_MIN_SCORE`) e analisa até 20 objetos por foto, ficando com a fruta de maior certeza.
- Se a pessoa escolheu a fruta e o detector não achou nada, o sistema analisa o centro da foto e avisa.

### 2.2 Classificar o frescor (parte desenvolvida pela equipe)

1. A região da fruta é reduzida para **160 × 160 pontos** e só uma **área oval** no centro entra na conta.
2. Fundo branco, reflexos e pontos quase pretos são ignorados.
3. São calculadas **8 medidas**: cor viva, manchas marrons, mofo (cinza ou branco), partes muito escuras, cor apagada, intensidade da cor, brilho e textura.
4. Uma **regressão logística** (uma para cada fruta) transforma as medidas na **chance de estar estragada**.
5. Estados: abaixo de 40% **Fresco**, de 40% a 70% **Moderado**, acima de 70% **Passado**.

### 2.3 Desempenho

Testado em **570 fotos que o modelo nunca viu** (dataset *Fruits fresh and rotten for classification*, Kaggle):

| Fruta | Acurácia | Precisão | Recall | F1 |
|---|---|---|---|---|
| Banana | 99,0% | 99,1% | 98,9% | 99,0% |
| Maçã | 93,1% | 93,1% | 92,8% | 93,0% |
| Laranja | 91,9% | 92,6% | 91,8% | 91,8% |
| **Geral** | **94,7%** | **95,0%** | **94,5%** | **94,7%** |

Detalhes completos no relatório em PDF "Fresh Food: como o modelo foi testado" e em `Docs/treino/README.md`.

---

## 3. Identidade visual

### 3.1 Cores (tema claro)

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#f4efe4` | Fundo da página (creme) |
| `--card-bg` | `#fbf8f1` | Cartões |
| `--header-bg` | `#fbf8f1` | Cabeçalho e faixa das frutas |
| `--chip-bg` | `#ece6d8` | Fundo dos círculos das frutas |
| `--border-light` | `#ddd4c2` | Bordas |
| `--text` | `#1f2a1e` | Texto principal |
| `--text-soft` | `#5e6656` | Texto secundário |
| `--accent` | `#2f5d3a` | Verde da marca: botões, anel da fruta escolhida, botão + |
| `--accent-soft` | `#e3ead9` | Faixa verde clara (cartão dos 3 passos no computador) |
| `--highlight` | `#e8b923` | Amarelo-banana (detalhes) |
| `--success` | `#3f7d3c` | Estado Fresco / "Pode consumir" |
| `--warning` | `#c98a12` | Estado Moderado / "Consuma logo" |
| `--danger` | `#b5482b` | Estado Passado / "Melhor não consumir" |

As três cores de estado lembram frutas de verdade: folha (fresco), banana madura (moderado) e terracota (fruta machucada).

Existe também um **modo escuro automático**, que aparece quando o aparelho está no tema escuro. **Decisão pendente:** manter automático, deixar sempre claro ou colocar um botão para a pessoa escolher.

### 3.2 Fontes

- **Fraunces** (com serifa): títulos e nome do app.
- **Work Sans**: textos e botões.
- As duas fontes ficam guardadas no próprio projeto, em `Assets/fonts/` (arquivos `.woff2` variáveis, cerca de 117 KB no total), com as licenças OFL junto. Não dependem mais do Google Fonts, então carregam mais rápido e funcionam sem internet.
- Tamanho mínimo de texto: 0.8rem (cerca de 13 px). Números (porcentagens, datas) usam algarismos de mesma largura para não "pular".
- O cartão de resultado para baixar espera as fontes carregarem antes de ser desenhado.

### 3.3 Ícones e imagens

- Ícones de linha desenhados em SVG (sem emojis).
- Imagens dos 3 passos em `IMG/passos/`, com fundo removido.
- Ícones do app instalado em `IMG/icones/`.

---

## 4. Telas e componentes

### 4.1 Cabeçalho e frutas

- Logo e nome **Fresh Food**.
- **Banana, Maçã e Laranja** em círculos (estilo Plantix). Tocar escolhe a fruta (anel verde) e o botão principal vira "Analisar banana", por exemplo. Tocar de novo desmarca e o sistema volta a procurar qualquer uma das três.
- **Botão +**: aba branca presa na borda, com círculo verde. **Em desenvolvimento**: ao tocar, mostra o aviso "Opção em desenvolvimento: em breve você poderá adicionar outras frutas."

### 4.2 Uso sem internet

Cartão que mostra se o app já está guardado no aparelho:

| Estado | Texto | Quando |
|---|---|---|
| Preparando | "Preparando..." com ícone girando | Guardando o site e o modelo |
| Pronto | "Pronto" com ✓ verde | Tudo guardado; pode usar sem internet |
| Sem internet | "Funcionando sem internet" | A conexão caiu, usando a versão guardada |
| Indisponível | "Indisponível" | Navegador sem suporte |

Ao tocar, mostra uma explicação. Quando o navegador permite, oferece **instalar o app** na tela inicial.

### 4.3 Cartão dos 3 passos

1. **Fotografe a fruta** (celular com maçã)
2. **Ver diagnóstico** (maçã com ✓)
3. **Pode consumir?** (maçã mordida)

Botão **"Analisar fruta"**, que abre a câmera, e link **"ou escolher uma foto da galeria"**.

### 4.4 Câmera

- **Celular:** tela cheia, com seta de voltar, moldura branca no centro, aviso embaixo da moldura e barra preta com galeria, botão redondo de fotografar e **?** (dicas para uma boa foto).
- **Computador:** a mesma câmera numa janela no centro da tela, com fundo escurecido.
- O aviso muda de "Aponte a câmera para uma banana, maçã ou laranja" para "Laranja encontrada! Pode fotografar." quando acha a fruta.
- Ao voltar ou ao terminar a análise, a câmera é desligada para economizar bateria.

### 4.5 Resultado

Na ordem em que aparece:

1. **Resposta "Pode consumir?"**, em destaque e na cor do estado. Em cima dela aparece a fruta, o estado e a **chance de estar estragada** calculada pelo modelo (mostrada entre 1% e 99%):
   - Fresco: **"Pode consumir"**
   - Moderado: **"Consuma logo"**, com dica de uso (suco, vitamina, bolo)
   - Passado: **"Melhor não consumir"**
   - Logo abaixo, o **"Por quê?"**: 2 ou 3 motivos curtos, montados com as medidas que mais pesaram naquela foto (ex.: "Manchas marrons em 27% da casca", "A casca está lisa"). Motivos bons aparecem com ✓ verde e motivos de atenção com ! amarelo ou vermelho.
2. Aviso: o resultado é uma estimativa pela aparência da casca; conferir cheiro e firmeza antes de comer.
3. **Cartão com a foto** analisada, com botões **Baixar**, **Compartilhar** (quando o aparelho permite) e **Nova foto**.
4. **Detalhes**: fruta, estado, chance de cada estado e certeza da detecção.
5. **"Por que deu esse resultado"**: recorte analisado, mapa da casca ponto a ponto, composição da casca, régua da chance de estar estragada e as medidas que mais pesaram (conta real da regressão logística).
6. **Confiabilidade da foto**: nitidez, se a foto é parecida com o treino, iluminação e tempo de análise.

Na tela inicial o bloco de resultado fica escondido até a primeira análise.

### 4.6 Avisos de confiabilidade

| Aviso | Como funciona | Limite |
|---|---|---|
| Foto tremida | Variância do Laplaciano (bordas) numa versão 256×256 da fruta | Abaixo de 12 |
| Foto fora do padrão | Distância de Mahalanobis entre as 8 medidas e as fotos de treino | 4,2 (banana), 5,3 (maçã), 5,7 (laranja) |
| Iluminação | Brilho médio da área analisada | Entre 22% e 88% |

### 4.7 Histórico ("Suas análises")

- Guarda as **últimas 12 análises** no próprio aparelho (IndexedDB), com miniatura, data e o selo da resposta.
- Tocar num item reabre o resultado completo, inclusive o painel de explicação.
- Botão **Limpar** (pede confirmação).
- Contador "X de 12", que fica amarelo quando enche.

**Avisos de limite:**

| Situação | Mensagem |
|---|---|
| Chegou a 12 | "Seu histórico chegou a 12 análises, o limite. Nas próximas, a mais antiga será apagada." |
| Da 13ª em diante | "Histórico cheio: guardamos só as últimas 12 análises. A mais antiga foi apagada." |
| Espaço do navegador acabou | Apaga as mais antigas e avisa |
| Espaço acima de 90% | Pede para tocar em Limpar |

### 4.8 Recados na tela (toast)

Aviso escuro na parte de baixo da tela, que some sozinho depois de 5 segundos. Usado para o botão +, histórico, uso sem internet e quando a foto da galeria não tem fruta.

---

## 5. Organização da tela

### 5.1 Celular (até 1100px)

Uma coluna, nesta ordem:

1. Cabeçalho (logo e nome) e faixa das frutas, de ponta a ponta
2. Uso sem internet
3. Cartão dos 3 passos
4. Suas análises (rolagem para o lado)
5. Resultado (só depois de uma análise; nessa hora os itens 2 a 4 somem e aparece "← Início")

### 5.2 Computador (acima de 1100px), modelo B

```
┌ logo Fresh Food ...... [Banana] [Maçã] [Laranja] [+] ...... Uso sem internet ┐
├──────────────────────────────────────────────────────────────────────────────┤
│ Faixa verde: 3 passos ..........................  [ Analisar fruta ]          │
├────────────────────────────────────────────────────┬─────────────────────────┤
│ Resultado                                          │ Suas análises (lista)   │
│ (antes da 1ª análise: "Seu diagnóstico aparece     │                         │
│  aqui", com borda tracejada)                       │                         │
└────────────────────────────────────────────────────┴─────────────────────────┘
```

- Barra no topo de ponta a ponta, com as frutas em botões pequenos de cantos levemente arredondados.
- A tela inicial nunca some: dá para analisar outra fruta sem voltar.
- A barra lateral antiga foi retirada.

---

## 6. Funcionamento sem internet

- `sw.js` (service worker) guarda o site, as bibliotecas (`Js/vendor/tf.min.js` e `Js/vendor/coco-ssd.min.js`), as imagens e o modelo COCO-SSD.
- `manifest.webmanifest` permite instalar o app, com os ícones de `IMG/icones/`.
- **Importante:** a cada mudança em qualquer arquivo do site, aumentar o número em `VERSAO` no início do `sw.js` (versão atual: `fresh-food-v21`). Sem isso, quem já abriu o site continua vendo a versão antiga.

---

## 7. Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página |
| `Assets/css/stayle.css` | Visual (cores, celular e computador) |
| `Assets/fonts/` | Fontes Fraunces e Work Sans com as licenças |
| `Js/escript.js` | Câmera, análise, resultado, histórico e uso sem internet |
| `Js/vendor/` | TensorFlow.js e COCO-SSD guardados no projeto |
| `sw.js` | Service worker (uso sem internet) |
| `manifest.webmanifest` | Dados para instalar o app |
| `IMG/passos/` | Imagens do cartão dos 3 passos |
| `IMG/icones/` | Ícones do app instalado e os globos de com internet (`com-internet.png`) e sem internet (`sem-internet.png`) |
| `Docs/treino/` | Scripts de treino e avaliação, métricas e README |
| `Docs/plan.md` | Este documento |

---

## 8. Limitações conhecidas

- As fotos de teste são, em sua maioria, de fundo branco e boa luz. **Ainda falta testar com fotos reais de celular.**
- O estado **Moderado** não pode ser validado, porque o dataset só tem fotos marcadas como fresca ou estragada.
- **Maçã amarela** tende a sair como passada (a cor viva da maçã cobre só vermelho e verde).
- **Laranja** que apodrece mantendo a cor laranja engana o modelo.
- O modelo só vê a casca: não percebe cheiro, firmeza nem o interior da fruta.
- **Fundo:** desde a v20 o fundo ligado à borda da caixa é separado antes da análise (seção 15). Com fundos artificiais o acerto ficou entre 91% e 95%, mas ainda falta confirmar com fotos reais. Fruta muito escura em fundo escuro continua difícil.
- **Maçã x laranja:** o detector às vezes troca as duas. O site avisa quando a cor discorda, mas não troca sozinho.

---

## 9. Próximos passos

- [ ] Testar com 30 fotos reais de celular e registrar os acertos
- [ ] Confirmar o funcionamento sem internet num celular (modo avião)
- [ ] Decidir o modo escuro (automático, sempre claro ou botão)
- [ ] Definir a função do botão + (adicionar outras frutas)
- [x] Fazer o sistema ignorar a cor do fundo nas bordas do recorte e treinar de novo (v20)
- [ ] Incluir a faixa do amarelo para maçã e treinar de novo
- [ ] Medir o tempo de análise em pelo menos três celulares

---

## 10. Revisão de outubro de 2026 (v15)

Correções feitas depois da revisão geral do projeto:

| Problema | Correção |
|---|---|
| A câmera podia ficar ligada escondida se a pessoa voltasse antes de ela terminar de abrir | A câmera agora é desligada na hora nesse caso |
| No computador, uma foto sem fruta apagava só metade do resultado anterior | O resultado anterior fica inteiro na tela e aparece só o aviso |
| "Fresco (100%)" parecia certeza total, mas era a altura da barra | Agora mostra a chance real de estar estragada, entre 1% e 99% |
| Ao abrir a câmera pelo teclado, o foco ficava fora dela | O foco vai para a câmera, o Tab fica dentro dela e, ao fechar, volta para o botão |
| A linha do "Por quê?" sumia no modo escuro | Linha visível no modo escuro |
| Código da barra lateral antiga e 65 regras de CSS sem uso | Removidos (CSS cerca de 12% menor) |

## 11. Melhora das fontes (v16)

| Antes | Agora |
|---|---|
| Fontes baixadas do Google a cada visita | Fontes guardadas no projeto e no modo sem internet |
| Alguns textos com 11 a 12 px | Nenhum texto menor que cerca de 13 px |
| Cartão para baixar podia sair com fonte padrão | Cartão espera as fontes antes de ser desenhado |
| Títulos e botões sem ajuste fino | Títulos mais justos, botões e números mais firmes, linhas com mais espaço |

## 12. Ícones de internet no botão "Uso sem internet" (v17)

- **Com internet e pronto:** globo verde (`IMG/icones/com-internet.png`).
- **Sem internet:** globo laranja riscado (`IMG/icones/sem-internet.png`).
- Enquanto prepara, continua o círculo girando; se o navegador não permite, continua o ícone de aviso.
- No computador, o texto do botão fica numa linha só.

## 13. Letras maiores no cartão do resultado (v18)

O cartão (foto com as informações embaixo) é desenhado com 1080 px de largura, mas no celular aparece com cerca de 1/3 disso. As letras ficavam com 8 a 10 px na tela.

| Parte | Antes | Agora |
|---|---|---|
| Nome da fruta | 76 | 100 |
| Fresco, Moderado, Passado e porcentagens | 30 | 44 |
| Explicação da casca | 28 | 40 |
| Dica de consumo | 32 | 44 |
| Certeza e legenda | 24 | 36 (legenda numa linha própria) |
| Aviso de foto tremida ou luz | 26 | 38 |

- No computador, o cartão passou de no máximo 560 px de altura para 640 px de largura, então as letras aparecem quase com o dobro do tamanho.
- O arquivo baixado também sai com as letras maiores.

## 14. Um número só para a chance de estar estragada (v19)

Antes o resultado mostrava dois números diferentes, o que parecia erro. Por exemplo: "Passado 98%" nas barras e "Chance de estar estragada: 88%" no texto. As três barras mostravam o quanto a chance estava perto de cada estado, e não a chance em si.

- As três barras (Fresco, Moderado, Passado) saíram, no cartão e na tela.
- No lugar entrou uma régua: de 0 a 40% é Fresco, de 40 a 70% é Moderado e de 70 a 100% é Passado. Um marcador mostra a chance calculada.
- O mesmo número aparece no topo do resultado, na régua da tela, na régua do cartão e na explicação.
- O texto da casca não repete mais a chance no final.
- Análises antigas do histórico continuam com o cartão antigo, porque a imagem já foi guardada pronta.

## 15. Revisão do modelo: separar o fundo (v20)

O que mudou na análise:

- **O fundo sai da conta.** As cores dos cantos da caixa são tratadas como fundo, e os pontos com essa cor ligados à borda são ignorados. Mancha no meio da fruta continua contando, porque não está ligada à borda.
- **Textura mais justa.** A textura só compara pontos vizinhos que são os dois da fruta.
- **Modelo treinado de novo** com essas medidas (os números novos estão no `Js/escript.js`).
- **Aviso de maçã x laranja.** Se a cor da casca discorda do detector com 90% de certeza ou mais, aparece: "Pela cor, esta fruta parece mais uma maçã. Se for, toque na maçã lá em cima e analise de novo." O site não troca a fruta sozinho, porque o teste pela cor acerta 85% e o detector costuma acertar mais.
- **Fruta escolhida no botão.** Se a pessoa escolheu "Maçã" e o detector achou uma "laranja", o site usa a caixa que o detector achou (antes analisava só o centro da foto).

Acerto com fundos diferentes (570 fotos de validação, fundo trocado por código):

| Fundo | Antes (v19) | Agora (v20) |
|---|---|---|
| Branco | 94,7% | 95,3% |
| Madeira | 72,5% | 91,2% |
| Pano escuro | 81,1% | 91,4% |
| Mesa cinza | 89,1% | 92,5% |
| Pano verde | 92,1% | 95,1% |
| Bege | 95,1% | 95,4% |
| **Média** | **87,4%** | **93,5%** |

- O JavaScript do site dá a mesma resposta do Python em 98,7% das fotos testadas.
- A análise da cor leva cerca de 9 ms no computador (a detecção da fruta continua sendo a parte mais demorada).
- Detalhes, scripts e todos os números: `Docs/treino/README.md`.

## 16. Aviso de várias frutas juntas (v21)

Pensado para o uso no supermercado, onde a fruta pode estar na banca, encostada em outras.

- Quando o detector acha outra fruta encostada ou por cima da fruta analisada, aparece: "Apareceu mais de uma fruta junto. Para um resultado melhor, segure uma fruta só na mão, longe das outras."
- O aviso aparece na câmera (no lugar de "Pode fotografar") e no resultado (também no cartão).
- Só contam frutas com pelo menos 40% de certeza do detector e com pelo menos 10% delas dentro da caixa analisada. Uma fruta longe não mistura o resultado, então não gera aviso.
- A mesma fruta detectada duas vezes (caixas quase iguais) não conta como duas.
- Limite: um cacho de bananas costuma ser detectado como uma banana só, então nesse caso o aviso não aparece.
