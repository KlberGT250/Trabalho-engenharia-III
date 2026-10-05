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
2. Só entra na conta uma área oval no centro (os cantos costumam ser fundo). Fundo branco e reflexos são ignorados.
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
pip install numpy pillow scikit-learn
python avaliar_formula_antiga.py   # acerto da fórmula antiga
python treinar.py                  # treina, mostra o acerto e gera modelo.json
python avaliar_metricas.py         # precisão, recall, F1, matriz de confusão e calibração dos avisos
```

Depois de treinar, copie os números de `modelo.json` para a constante `MODELO` em `Js/escript.js`.
