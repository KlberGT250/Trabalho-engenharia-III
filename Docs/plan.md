Documentação de implementação — Fresh Food (v1.1)
Visão geral da atualização
Esta versão corrige dois problemas estruturais do protótipo anterior — dimensionamento responsivo e paleta de cores — e transforma a sidebar direita de um mockup estático em um painel funcional, conectado ao fluxo de seleção de fruta e captura de câmera. O arquivo de referência é prototipo-fresh-food.html, autocontido (HTML + CSS + JS em um único documento).

Paleta de cores
O tema passou de dark mode para um fundo claro, mantendo o verde como identidade visual da marca.

Token	Antes (dark)	Agora (light)	Uso
--bg	#0a0e1a	#ffffff	Fundo geral da página
--panel-bg	#0d1117	#f6f8f6	Header, sidebars, painel de status
--card-bg	—	#ffffff	Cards de fruta, botões, badges
--border-soft	rgba(255,255,255,0.08)	rgba(15,23,20,0.10)	Divisórias e bordas sutis
--text	#ffffff	#12261b	Texto principal
--text-muted	#8b949e	#667a6e	Rótulos e texto secundário
--accent / --accent-bright	#4CAF80 / #3ddc84	#1f8f52 / #2fb46a	Cor de marca, estado "Fresco"
--warn	#f2c94c	#b8720a	Estado "Moderado"
--danger	#eb5757	#c23b3b	Estado "Passado"
Os tons de accent, warn e danger foram escurecidos em relação ao dark mode porque, sobre fundo branco, as versões originais (pensadas para contraste contra #0a0e1a) perdiam legibilidade — os novos valores mantêm a mesma leitura semântica (verde = bom, âmbar = atenção, vermelho = alerta) com contraste adequado em fundo claro.

Uma variante :root[data-theme="dark"] foi deixada pronta no CSS, redefinindo os mesmos tokens para uma versão escura — não ativada por padrão, mas disponível caso o projeto queira oferecer alternância de tema no futuro.

# Estrutura de breakpoints responsivos

O layout usa três faixas, cobrindo tanto a correção "normal" (desktop) quanto a mobile pedidas:

Desktop padrão (acima de 1300px) Grid fixo 280px minmax(0,1fr) 320px. O uso de minmax(0,1fr) no lugar de 1fr puro é o que impede a coluna central de ser espremida a zero quando as duas sidebars somam 600px de largura fixa — sem isso, o grid tentava garantir o conteúdo mínimo intrínseco de cada coluna e "roubava" espaço da câmera.

Desktop intermediário (1101px–1300px) Faixa nova, que não existia na versão anterior. As sidebars encolhem para 240px e 280px, e o padding interno de sidebars e área central é reduzido (de 24px/32px para 20px/28px). Sem essa faixa, telas de notebook menores (ex.: 1200px) ficavam com a câmera desconfortavelmente estreita antes de o layout mobile entrar em ação.

Mobile (1100px e abaixo) Breakpoint mantido em 1100px (não 900px) — decisão já validada na rodada anterior, porque abaixo de ~1100px as duas sidebars fixas ainda cabiam lado a lado numa faixa intermediária e "engoliam" o espaço da câmera antes do grid colapsar. Nessa faixa:

.layout vira coluna única (1fr).
As duas sidebars saem do fluxo normal (position: fixed), ocupando min(84vw, 320px) de largura, e ficam escondidas fora da tela via transform: translateX(...).
Os botões "☰ Sobre" e "Fruta 📋" no header (#openLeft / #openRight) adicionam a classe .open, trazendo cada sidebar de volta com uma transição de 0.25s.
Um .overlay escurece o conteúdo atrás do drawer aberto e fecha ambas as sidebars ao ser clicado.
Câmera muda de aspect-ratio: 16/9 para 4/3 (melhor aproveitamento vertical em telas estreitas), botões de fruta reduzem padding/fonte, e o painel de status empilha em 1 coluna.

# Sidebar direita — de mockup a painel funcional

As três seções da sidebar direita agora têm estado vazio e estado preenchido, controlados por JavaScript e disparados pelo mesmo evento de clique que ativa a câmera.

Fluxo de disparo Tanto os três botões abaixo da câmera (.fruit-btn) quanto os três cards na sidebar esquerda (.fruit-card) chamam a função startCamera(fruitName). Isso unifica os dois pontos de entrada — selecionar a fruta pela esquerda ou pelo centro produz o mesmo resultado à direita.

Fruta detectada (topo) Ao clicar, a seção volta primeiro ao estado vazio (#rsEmpty visível, #rsFruit oculto) enquanto a câmera inicializa. Depois de obtida a permissão de câmera e simulada a detecção (ver seção COCO-SSD abaixo), #rsEmpty é escondido e #rsFruit exibido, preenchendo emoji, nome da fruta e badge de confiança (Math.floor(78 + Math.random() * 20), ou seja, entre 78% e 97%).

Status de frescor (meio) A função pickFreshness() sorteia um estado entre Fresco, Moderado e Passado usando um pool ponderado (pesos 5/3/1 — o triplo de chance de "Fresco" em relação a "Passado"), simulando uma distribuição realista de frutas testadas. O badge recebe a classe correspondente (.fresco, .moderado, .passado), que já existe no CSS com as cores semânticas da tabela acima, e o texto de recomendação é preenchido a partir do campo rec de cada estado.

Valores nutricionais (corpo) fillNutrition(fruitName) lê o objeto fruitData[fruitName].nutrition e gera dinamicamente os <li> da lista — nada é hardcoded no HTML. Os valores por fruta (Banana, Maçã, Laranja), por 100g:

Nutriente	Banana	Maçã	Laranja
Calorias	89 kcal	52 kcal	47 kcal
Carboidratos	22.8 g	13.8 g	11.8 g
Proteínas	1.1 g	0.3 g	0.9 g
Fibras	2.6 g	2.4 g	2.4 g
Vitamina C	8.7 mg	4.6 mg	53.2 mg
Potássio	358 mg	107 mg	181 mg
Reset entre seleções Se o usuário trocar de fruta antes ou depois de uma detecção concluída, startCamera reseta imediatamente os três blocos da direita e o painel de status central para o estado neutro, evitando mostrar dados da fruta anterior enquanto a nova é "detectada".

# Ponto de integração do COCO-SSD
O bloco setTimeout(() => {...}, 1200) dentro de startCamera é a simulação temporária — ele existe só para validar visualmente o comportamento das três seções sem depender do modelo treinado. Está marcado no código com um comentário explícito. Na implementação final, esse bloco deve ser substituído por:

Carregamento do modelo COCO-SSD via TensorFlow.js (cocoSsd.load()).
Um loop de inferência sobre os frames do elemento #cameraVideo (model.detect(cameraVideo)).
Mapeamento das classes pré-treinadas relevantes (banana, apple, orange) para os nomes em português usados em fruitData.
Uso do score retornado pela detecção no lugar do valor aleatório de confiança.
Um classificador (ou heurística) adicional para o nível de frescor, já que o COCO-SSD por si só identifica a fruta mas não seu estado de maturação/frescor — esse é o ponto ainda em aberto no projeto.
Tratamento de erro de câmera
Mantido e simplificado: se navigator.mediaDevices.getUserMedia falhar (permissão negada, dispositivo não encontrado), a classe .error é aplicada ao .camera-box, exibindo a mensagem "Não foi possível acessar a câmera..." no lugar do placeholder padrão, e o status central muda para "Câmera indisponível". Importante lembrar que captura de câmera exige HTTPS em produção (funciona em localhost sem certificado, mas não em domínios http:// simples).

Arquivos
prototipo-fresh-food.html — protótipo funcional único, já publicado como artifact.
Este documento (doc-implementacao-fresh-food.md) — referência de implementação para consulta durante o desenvolvimento ou para compor a documentação do Projeto de Engenharia 3.