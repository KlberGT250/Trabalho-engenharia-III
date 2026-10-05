# Trabalho-engenharia-III
## Funciona sem internet

O Fresh Food pode ser instalado no celular e usado offline:

- **Primeira visita (com internet):** o `sw.js` (service worker) guarda no aparelho o site, as bibliotecas
  (`Js/vendor/tf.min.js` e `Js/vendor/coco-ssd.min.js`) e o modelo COCO-SSD que acha a fruta na foto.
- **Depois disso:** o site abre e analisa fotos mesmo sem internet. Aparece "Pronto para usar sem internet"
  embaixo do título quando tudo já está guardado.
- **Instalar:** no Chrome do Android aparece o botão "Instalar no celular". No iPhone, use
  Compartilhar > Adicionar à Tela de Início.
- **Atualizações:** sempre que mudar algum arquivo do site, aumente o número em `VERSAO` no início do
  `sw.js` (por exemplo, `fresh-food-v2`). Assim os celulares trocam a versão guardada pela nova.
