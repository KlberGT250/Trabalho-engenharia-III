# Treino do classificador de frescor

Scripts usados para criar e testar a análise de frescor do Fresh Food.

## Dados

Dataset do Kaggle **Fruits fresh and rotten for classification** (banana, maçã e laranja, frescas e estragadas).
Coloque a pasta `Datasets/` (com `train/` e `test/`) ao lado destes scripts.

O dataset tem cópias giradas e espelhadas da mesma foto (`rotated_by_60_...`, `vertical_flip_...`).
Por isso a separação é feita **pela foto original**: todas as cópias de uma mesma fruta ficam só no
treino ou só na validação. Assim o teste nunca usa uma fruta que o modelo já viu.

- Calibração (treino): 735 fotos
- Validação (teste): 498 fotos, nunca usadas no treino

## Como funciona

1. A região da fruta encontrada pelo COCO-SSD é reduzida para 160x160.
2. Só entra na conta uma área oval no centro. Fundo branco, reflexos e (desde a versão 2) o fundo de
   qualquer cor ligado à borda da caixa são ignorados. Veja "Versão 2" abaixo.
3. São medidas 8 características da casca: cor viva, manchas marrons, mofo (partes acinzentadas ou esbranquiçadas),
   partes escuras, cor apagada, saturação média, brilho médio e textura (casca lisa ou enrugada).
4. Uma regressão logística por fruta transforma essas medidas na chance de estar estragada.
5. Abaixo de 40% é **Fresco**, acima de 70% é **Passado**, e no meio é **Moderado**.

## Resultados na validação (498 fotos)

| Fruta   | Fórmula antiga | Classificador novo |
|---------|----------------|--------------------|
| Banana  | 94%            | 99%                |
| Maçã    | 71%            | 93%                |
| Laranja | 76%            | 94%                |
| Geral   | 80%            | 96%                |

Rodando o código JavaScript do site no navegador, nas mesmas 498 fotos: **95,4%** de acerto.

A fórmula antiga errava principalmente as frutas estragadas: laranja com mofo (cinza, branco ou verde) e maçã
com podridão marrom-clara eram classificadas como frescas, porque ela só procurava manchas marrons escuras.

## Métricas completas e avisos de confiabilidade

`avaliar_metricas.py` usa o modelo já treinado e calcula, nas fotos de validação (570 fotos numa nova
amostra baixada em outubro/2026):

| Fruta   | Fotos | Acurácia | Precisão | Recall | F1    |
|---------|-------|----------|----------|--------|-------|
| Banana  | 199   | 99,0%    | 99,1%    | 98,9%  | 99,0% |
| Maçã    | 174   | 93,1%    | 93,1%    | 92,8%  | 93,0% |
| Laranja | 197   | 91,9%    | 92,6%    | 91,8%  | 91,8% |
| Geral   | 570   | 94,7%    | 95,0%    | 94,5%  | 94,7% |

Precisão, recall e F1 são a média das duas classes (fresca e estragada), como no artigo FreshNet.
O resultado completo, com a matriz de confusão, fica em `metricas.json`.

O mesmo script calibra os dois avisos do site:

- **Foto tremida:** variância do Laplaciano numa versão 256x256 da fruta. Limite 12. Marca 2,6% das
  fotos nítidas e 56,9% das fotos com leve desfoque (blur gaussiano de raio 2).
- **Foto fora do padrão:** distância de Mahalanobis entre as 8 medidas e as fotos de calibração
  (versão simples da detecção de anomalia do FreshNet, que usa autoencoder). O limite deixa passar
  97,5% das fotos de calibração. Marca 3,9% das fotos normais de validação e 22% a 54% das fotos em
  que a fruta escolhida está errada. Os números ficam em `anomalia.json` e na constante `ANOMALIA`
  do `Js/escript.js`.

Rodando o JavaScript do site no navegador em 90 dessas fotos, o resultado bate com o Python
(82 contra 83 acertos) e a nitidez medida tem correlação de 0,99 com a do Python.

## Limitações

- O dataset só tem duas classes (fresca e estragada). O estado **Moderado** é a faixa intermediária
  de chance, não foi treinado com exemplos próprios.
- As fotos do dataset são, em boa parte, de fundo branco e bem iluminadas. Fotos de celular em
  ambientes reais podem ter resultado pior. O ideal é testar com fotos próprias.

## Como rodar

```bash
pip install numpy pillow scikit-learn scipy
python avaliar_formula_antiga.py   # acerto da fórmula antiga
python treinar.py                  # treina, mostra o acerto e gera modelo.json
python avaliar_metricas.py         # precisão, recall, F1, matriz de confusão e calibração dos avisos
python avaliar_fundos.py           # acerto com 6 fundos diferentes (usa fundos.py)
python avaliar_fundos.py modelo_v1.json caracteristicas_v1   # o mesmo teste com o modelo antigo
python treinar_cor.py              # classificador maçã x laranja pela cor, gera cor_fruta.json
```

Depois de treinar, copie os números de `modelo.json` para a constante `MODELO` em `Js/escript.js`.

## Versão 2 (outubro/2026): separar o fundo

Problema: nas fotos reais a fruta fica em cima de mesa, pano ou bancada. A caixa do detector é um
retângulo, então o fundo entra na conta. Num teste trocando o fundo branco das fotos por outros
fundos, o modelo antigo errava muito com fundo de madeira (a madeira contava como "mancha marrom").

### Como o fundo é separado (`caracteristicas.py`, função `mascara_fundo`)

1. As cores dos cantos da caixa (fora do círculo que cabe nela) são resumidas em até 3 cores (k-means).
2. Pontos com cor parecida (distância menor que 0,13 em RGB de 0 a 1) e **ligados à borda** viram fundo.
   Uma mancha escura no meio da fruta não está ligada à borda, então continua contando.
3. Se o "fundo" cobrir mais de 60% do oval, nada é removido (proteção para foto muito fechada na fruta).

Também mudou a textura: agora só conta a diferença entre pontos vizinhos que são os dois da fruta
(antes a borda entre fruta e fundo deixava a casca "enrugada").

Testamos também descartar as cores que aparecem no meio da caixa, mas isso atrapalhava a banana
(por dentro da curva dela, o meio da caixa é fundo). Testamos limites de cor 0,10, 0,13 e 0,17: 0,13 foi o melhor.
O modelo continua treinado só com as fotos originais (fundo branco). Treinar também com fundos
artificiais deu resultado pior nos fundos que ele não tinha visto, então ficamos com o mais simples.

### Teste com fundos (`fundos.py` e `avaliar_fundos.py`)

As 570 fotos de validação com o fundo branco trocado por 5 fundos gerados por código, com textura,
ruído, luz desigual e sombra (`resultado_fundos_v1.txt` e `resultado_fundos_v2.txt`):

| Fundo        | Modelo v1 | Modelo v2 |
|--------------|-----------|-----------|
| Branco       | 94,7%     | 95,3%     |
| Madeira      | 72,5%     | 91,2%     |
| Pano escuro  | 81,1%     | 91,4%     |
| Mesa cinza   | 89,1%     | 92,5%     |
| Pano verde   | 92,1%     | 95,1%     |
| Bege         | 95,1%     | 95,4%     |
| **Média**    | **87,4%** | **93,5%** |

Métricas completas da v2 no fundo branco (`metricas.json`; as da v1 ficaram em `metricas_v1.json`):
banana 99,5%, maçã 93,7%, laranja 92,4%, geral 95,3% (F1 95,2%).

Rodando o JavaScript do site em 150 fotos (branco, madeira e pano escuro), a resposta bate com a do
Python em 98,7% das fotos (correlação da chance 0,999). A análise da cor leva em média 9 ms.

### Maçã ou laranja (`cor_fruta.py`, `treinar_cor.py`)

O COCO-SSD às vezes chama maçã amarelada de laranja. Um classificador simples pela cor da casca
(12 faixas de matiz, parte sem cor, saturação e brilho) acerta maçã x laranja em 85% das fotos.
Como não é tão bom quanto o detector, ele **não troca a fruta sozinho**: só mostra um aviso quando
discorda com 90% de certeza ou mais. Aviso indevido: 3% das fotos. Quando o detector erra a fruta,
o aviso aparece em cerca de 43% a 59% dos casos.

### Limites que continuam

- Os fundos do teste são artificiais. Ainda falta o teste com fotos reais de celular.
- Fruta muito escura em fundo escuro: o fundo não é separado (proteção dos 60%) e o resultado pode puxar para "passado".
