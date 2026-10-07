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

1. **Resposta "Pode consumir?"**, em destaque e na cor do estado:
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
- **Importante:** a cada mudança em qualquer arquivo do site, aumentar o número em `VERSAO` no início do `sw.js` (versão atual: `fresh-food-v14`). Sem isso, quem já abriu o site continua vendo a versão antiga.

---

## 7. Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página |
| `Assets/css/stayle.css` | Visual (cores, celular e computador) |
| `Js/escript.js` | Câmera, análise, resultado, histórico e uso sem internet |
| `Js/vendor/` | TensorFlow.js e COCO-SSD guardados no projeto |
| `sw.js` | Service worker (uso sem internet) |
| `manifest.webmanifest` | Dados para instalar o app |
| `IMG/passos/` | Imagens do cartão dos 3 passos |
| `IMG/icones/` | Ícones do app instalado |
| `Docs/treino/` | Scripts de treino e avaliação, métricas e README |
| `Docs/plan.md` | Este documento |

---

## 8. Limitações conhecidas

- As fotos de teste são, em sua maioria, de fundo branco e boa luz. **Ainda falta testar com fotos reais de celular.**
- O estado **Moderado** não pode ser validado, porque o dataset só tem fotos marcadas como fresca ou estragada.
- **Maçã amarela** tende a sair como passada (a cor viva da maçã cobre só vermelho e verde).
- **Laranja** que apodrece mantendo a cor laranja engana o modelo.
- O modelo só vê a casca: não percebe cheiro, firmeza nem o interior da fruta.

---

## 9. Próximos passos

- [ ] Testar com 30 fotos reais de celular e registrar os acertos
- [ ] Confirmar o funcionamento sem internet num celular (modo avião)
- [ ] Decidir o modo escuro (automático, sempre claro ou botão)
- [ ] Definir a função do botão + (adicionar outras frutas)
- [ ] Incluir a faixa do amarelo para maçã e treinar de novo
- [ ] Medir o tempo de análise em pelo menos três celulares
