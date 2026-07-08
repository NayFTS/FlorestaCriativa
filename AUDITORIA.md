# Auditoria — Floresta Criativa (07 jul 2026)

Levantamento completo do estado atual do site antes da próxima leva de decorações: bugs de código, falhas de responsividade mobile, comparação com os mockups em `public/imagens/UX Design/` e um inventário do que já dá pra usar dos assets parados na pasta.

Nada foi alterado durante essa auditoria — é só leitura e mapeamento.

---

## Resumo

| Área | Alta | Média | Baixa |
|---|---|---|---|
| Bugs & inconsistências | 3 | 12 | 5 |
| Responsividade mobile | 3 | 8 | 7 |

Mais: 5 páginas com gaps em relação aos mockups, e 45+ assets em `UX Design/` ainda não usados no site.

---

## 1. Responsividade mobile

### Alta

1. **`styles.css` ~584-600, ~2150-2174 · `post.html` 112-115** — No post.html mobile, o botão de hambúrguer (fixo, canto superior esquerdo, z-index 210) fica literalmente em cima do novo botão "← Voltar" da barra fixa — os dois disputam o mesmo canto e é fácil tocar no errado.

2. **`search.js` 68-71, 270-276 · `styles.css` (z-index 198-200, 210)** — Drawer (z-index 199) e overlay de busca (z-index 200) não se fecham um ao outro. Se o drawer abrir com a busca já aberta, ele fica escondido atrás do fundo escuro da busca — o menu "abre" sem feedback visual nenhum.

3. **`styles.css` ~816-821 vs ~841-850 (`managePosts.html`)** — Dois breakpoints (768px e 600px) brigam pela mesma célula: `#postsTable td:first-child` trava em 140px de largura mesmo depois da tabela virar cards no mobile — a linha "Título" fica visualmente espremida em todo card, enquanto as outras linhas ocupam a largura toda.

### Média

4. **`styles.css` ~4047-4064 (`.lightbox-nav`)** — Setas do lightbox (~50-60px, a 16px da borda) cobrem parte da imagem em telas de 320-375px, já que a imagem também começa perto da borda (max-width:90vw).

5. **`styles.css` linha 124 (`html{overflow-x:clip}`), ~3048 (`.content-body pre/code`)** — Blocos de código ou URLs longas sem quebra dentro do conteúdo de um post ficam cortados (não rolam, não quebram linha) — o texto some da tela em vez de aparecer com scroll.

6. **`styles.css` 1718-1748 (900px) vs 578+ (768px)** — Entre 769px e 900px de largura, a home mostra o chrome de desktop completo (topbar + sidebar) junto com o layout "mobile" dos widgets (1 coluna) — um meio-termo que não bate com nenhum dos dois designs.

7. **`styles.css` ~1779-1781, ~1890-1892 (guestbook) vs 768px do nav** — O formulário do guestbook só empilha em coluna única a partir de 700px, mas o nav mobile (drawer/bottom-nav) já assume o controle a partir de 768px — entre 701-768px o guestbook fica com formulário e lista espremidos lado a lado.

8. **`dashboard.html` / `managePosts.html` / `publicar.html` / `editPost.html` (drawer + bottom-nav)** — Nenhuma página admin linka de volta pro Dashboard ou Manage Posts no mobile — uma vez que a autora navega de Dashboard pra Manage Posts (ou editPost), só o botão "voltar" do navegador resolve.

9. **`dashboard.html`/`managePosts.html`/`publicar.html`/`editPost.html`/`login.html` — bottom-nav (~78-83) vs `index.html`/`post.html` (~99-102)** — As páginas admin ficaram com o bottom-nav antigo de 4 itens, sem o botão redondo central que já existe nas páginas públicas — a atualização do bottom nav não chegou nas páginas de admin.

10. **`dashboard.html`/`managePosts.html`/`publicar.html`/`editPost.html`/`login.html` — `.nav-drawer` (~55-73)** — Mesma história dos widgets Currently/Mood no drawer: só as 6 páginas públicas ganharam o bloco novo; as páginas admin mantiveram o drawer sem eles.

11. **`styles.css` ~2826-2841 (`.like-btn`)** — O botão de curtir (nos cards de post e no cabeçalho do post) tem só ~20-26px de altura tocável, bem abaixo do mínimo recomendado (~40-44px) — fácil de errar o toque no celular.

### Baixa

12. **`editPost.html`** — botão de remover imagem da galeria (`.gallery-remove-btn`) tem só 20×20px.
13. **`styles.css` ~2794-2801** — rodapé dos cards de post (botão "Leia mais" + data) não tem `flex-wrap`; datas mais longas podem espremer contra a borda em telas de ~320-360px.
14. **`styles.css` ~645-657** — ícones do rodapé do drawer (busca, tema) ficam em 38×38px, um pouco abaixo do confortável.
15. **`styles.css` ~2176-2185** — botão de compartilhar da barra mobile do post.html tem 34×34px.
16. Páginas admin (sem `page-public`) mantêm `.site-main{margin:20px}` no mobile, enquanto páginas públicas zeram essa margem — inconsistência visual de espaçamento entre admin e público.
17. **`styles.css` 1509-1581** — os controles de "Now Playing" (⏮ ▶ ⏭) parecem clicáveis mas são só decorativos (como planejado), sem handler algum — no card mobile full-width isso fica mais chamativo e mais convidativo ao toque à toa.
18. **`styles.css` 710-822, 909-915** — CSS morto de um nav horizontal antigo (`.hamburger`, `.menu`, `#header-image`) que nenhuma página mais usa.

---

## 2. Bugs & inconsistências

### Alta

1. **`api/index.js` ~400-420 (like/unlike)** — Não há nenhuma verificação de "quem curtiu" no servidor — o estado real vive só no `localStorage` do navegador. Qualquer script pode chamar `/unlike` repetidamente (respeitando só o rate limit de 30/h por IP) e zerar as curtidas de um post, ou inflar artificialmente. O número não é confiável como métrica real.

2. **`api/index.js` ~620-629 (`/admin/comments/:id/approve`)** — Aprovar o mesmo comentário duas vezes (duplo clique antes do botão desabilitar, requisição repetida) incrementa `commentsCount` duas vezes — não há checagem de "já estava aprovado" antes de incrementar.

3. **`post.html` 449,460,472,475 · `search.js` 427,430,433** — Título do post, tags de tecnologia e `alt` de imagem vão pro HTML sem escapar (diferente de categorias e comentários, que já usam `escapeHtml`). Hoje só a autora cria posts, então não é explorável por terceiros — mas um título com aspas já quebra a renderização, e vira um vetor real de XSS se a conta admin for comprometida algum dia.

### Média

4. **`models/Post.js`** — Schema morto, não usado em lugar nenhum (confirmado por busca no repo inteiro) — está desatualizado (sem slug/views/likes/commentsCount/status/gallery) e ainda referencia um model `User` que não existe mais.

5. **`dist/styles.css`** — Artefato de build de 4 de julho, 11KB, bem desatualizado em relação ao `public/styles.css` atual (100KB). Não há build step no projeto e nada referencia essa pasta — puro lixo que pode confundir quem for mexer no CSS errado.

6. **`styles.css` — `.footer-content`, `.hamburger`, `.search-container`, `.section-container`, `.section-divider`, `.sticker-pill`, `.widget-quicklinks`** — CSS órfão, sobrando de uma fase anterior ao layout topbar/sidebar/drawer — sem HTML correspondente em nenhuma página atual.

7. **`sobre-mim.html` linha 70** — Único ponto de deriva entre as 6 páginas públicas: o link "Sobre Mim" no drawer tem `class="active"` fixo no HTML, enquanto todas as outras dependem só do `markActiveNavLinks()` em JS. Inofensivo hoje, mas uma armadilha se a página for duplicada.

8. **`api/index.js` — `/logout`, `DELETE /posts/:id`, `/recent-posts`, `/search`, `/user-posts`, `/posts`** — Essas rotas ainda respondem com `res.send('texto')` em vez do padrão `res.json({...})` usado em todo o resto (comentários/guestbook/settings/spotify/curtidas). Como o cliente sempre faz `.then(r => r.json())`, um erro nessas rotas quebra o parse antes de cair no `.catch()` — funciona "sem querer", mas é frágil.

9. **`api/index.js` — `POST /posts/:id/like`, `/unlike`, `PATCH /posts/:id/publish`, `DELETE /posts/:id`** — Essas quatro rotas não validam se `:id` é um ObjectId válido antes de consultar o Mongoose (as outras rotas com `:id` validam). Um id malformado vira erro 500 genérico em vez de 400 limpo.

10. **`post.html` 428 (dedup) vs `search.js` ~341 (sem dedup)** — Categorias duplicadas de um post antigo são filtradas ao abrir o post individual, mas aparecem duplicadas nos resultados de busca — o mesmo post mostra categorias limpas num lugar e repetidas em outro.

11. **`api/index.js` — `POST /editPost/:id`** — Editar um post não permite mudar `status` (rascunho/publicado) nem limpar a imagem de capa — o único caminho pra despublicar é o botão de publish em managePosts.html, e não há como voltar um post publicado pra rascunho de novo.

12. **`api/index.js` — `/dashboard-stats`, `/user-posts`** — Carrega todos os posts na memória (`Post.find({})`) só pra somar contadores, em vez de usar agregação — não é bug no tamanho atual, mas não escala, e o "mais popular" ainda só olha `views`, ignorando os novos `likes`/`commentsCount`.

### Baixa

13. **`api/index.js` linha 132** — cache do token do Spotify é só uma variável de módulo; em cold starts concorrentes da Vercel, cada instância renova o token separadamente. Baixo impacto pro volume de tráfego de um blog pessoal.
14. **`api/index.js` linha 196** — `require('express-validator')` declarado no meio do arquivo em vez de junto com os outros requires do topo.
15. **`package.json`** — `mongodb` listado como dependência direta mas nunca importado diretamente (só via mongoose/connect-mongo) — provável sobra de uma implementação anterior.

---

## 3. Comparação com os mockups (`public/imagens/UX Design/`)

### Home — `mockup-desktop-rascunho-home.png` · `mockup-mobile-rascunho-menu-home-post.png`
- ✅ Hero, últimos posts, Quick Links, Now Playing (com capa/progresso/controles), Garden Log, Currently/Mood, Guestbook — tudo já implementado e batendo com o mockup.
- ⭕ Moldura de vinhas/folhas pendurada nos 4 cantos da página (o "frame" verde que envolve todo o layout no mockup) — não existe em nenhuma página hoje.
- ⭕ Placa de madeira "NAYFTS" pendurada com o sapinho sentado em cima, balançando — hoje é só uma imagem estática no sidebar.
- ⭕ Fileira de ícones sociais (GitHub/Instagram/Twitter/e-mail) no rodapé — existe só um link de GitHub, isolado, na página Sobre Mim.

### Verde Inspiração / Rascunhos (listagem) — `mockup-blog-desktop-tema-claro.png`
- ✅ Cards de post com capa, título, tag, resumo, data, curtidas e comentários (acabamos de implementar).
- ⭕ Pílulas de filtro por categoria inline acima da lista (all posts/thoughts/writing/art/...) — hoje o filtro de categoria só existe escondido dentro do overlay de busca.
- ⭕ Dropdown de ordenação ("latest first") e alternância grid/lista.
- ⭕ Paginação numerada (1 2 3 4 5 ... 12) — hoje é só um botão "Carregar mais".
- ⭕ Sidebar da listagem com "featured post", "popular tags", "reading playlist" (Now Playing também aqui, não só na home) e "recent activity" — hoje essa página não tem sidebar de widgets nenhuma.

### Sapo Imaginário (portfólio) — `mockup-portfolio-desktop-tema-claro.png`
- ✅ Grid de projetos com preview drawer, tech tags e link externo.
- ⭕ Filtro por tipo de trabalho (illustration/web design/ui-ux/coding/personal) e alternância grid/lista.
- ⭕ Sidebar com "featured project", "tools i use" (Figma/Procreate/VS Code/...), "skills & services" e "recent updates" — nenhuma dessas existe na página hoje.

### Sobre Mim — `mockup-about-desktop-tema-claro.png`
- ✅ Intro com foto, texto sobre a autora, sitemap do site, link de GitHub.
- ⭕ Bloco "quick facts" (bebida favorita, clima favorito, hobby, personalidade...) em formato de tabelinha.
- ⭕ Nuvem de tags "things i love" (frogs, books, coding, tea, cozy games...).
- ⭕ Timeline "my journey" (2018 → 2024, marcos do site/autora).
- ⭕ Ilustração "cozy shelf" e widgets de sidebar ("featured memory", "my tools", "things that matter", "current notes").

### Chrome geral (topbar/nav) — todos os mockups desktop
- ⭕ Ícone de engrenagem/configurações ao lado do toggle sol/lua no topbar desktop (visível em todos os mockups, ausente hoje).
- ⭕ Consistência do bottom-nav e drawer-widgets nas páginas admin (ver achados #9 e #10 da seção de responsividade mobile).

---

## 4. Ideias de decoração

A pasta `public/imagens/decor/` só tem ~19 dos mais de 60 arquivos que já existem em `public/imagens/UX Design/`. Segue o resto, agrupado por onde encaixaria bem:

**Vinhas penduradas nos cantos** — o maior "gap" visual dos mockups; folhagem pendurada no topo de cada página, emoldurando o conteúdo (`position:fixed` decorativo nos 4 cantos do `.site-shell`):
`planta-galho-vertical-folhas.png`, `planta-galho-vertical-folhas-2.png`, `planta-pendente-folhas-1.png`, `planta-pendente-folhas-2.png`

**Molduras extras** — pra foto de perfil do Sobre Mim, Featured widget, ou cards de projeto:
`moldura-circular-fina-flor.png`, `moldura-circular-galho-flor.png`, `moldura-quadrada-cantos-folhas.png`, `moldura-serrilhada-margarida.png`, `moldura-cantos-folhas-vertical.png`

**Ícones de navegação customizados** — substituiriam os emojis atuais (🏠🌿🐸📝❤️💬) no bottom-nav, sidebar-nav e selos de curtida/comentário:
`icone-home.png`, `icone-coracao.png`, `icone-comentario-balao.png`, `icone-portfolio-pasta.png`

**Divisores de seção** — variedade além do tracejado já usado no guestbook:
`divisor-coracao-setas-folha.png`, `divisor-ondas-brilho.png`, `divisor-vinha-horizontal.png`

**Placas de madeira** — seta de direção combina com uma página 404 (ainda não existe) ou "próximo/anterior post"; a de coração+vinha serve pro rodapé:
`placa-madeira-seta-direcao.png`, `placa-madeira-coracao-vinha.png`

**Sapinhos de estado vazio** — pra "nada aqui ainda" (busca sem resultado, guestbook vazio, lista de posts vazia) em vez do texto simples atual:
`sapo-dormindo-lago.png`, `sapo-lendo-livro.png`, `sapo-abracando-barriga.png`, `sapo-de-costas-manchas.png`, `sapo-espiando-agua-1.png`, `sapo-espiando-agua-2.png`

**Flores e pedras soltas** — pra pontuar espaços vazios sem competir com o conteúdo:
`flor-amarela-caule.png`, `flor-margarida-branca.png`, `flor-margarida-caule-folha.png`, `flor-rosa-pequena.png`, `flor-roxa-caule.png`, `asset-pedras-musgo-grande.png`, `asset-pedras-musgo-pequeno.png`

**Cenário / paisagem** — peças maiores pra um rodapé ilustrado mais elaborado:
`asset-toco-arvore-flor.png`, `asset-tronco-caido.png`, `asset-tronco-caido-flores.png`, `asset-lanterna.png`, `asset-lanterna-noturno.png`, `asset-caneca-sapo.png`, `asset-galho-folhas-horizontal.png`, `asset-vitoria-regia-flor-branca.png`

**Não usar diretamente** — são folhas de referência/sticker sheet, servem pra inspirar recortes novos, não pra colar direto no site:
`assets-stickers-diversos.png`, `referencia-assets-sheet-claro-1.png`, `referencia-assets-sheet-escuro-1.png`, `widget-barra-pesquisa-vazia.png`, `widget-botao-pilula-coracao.png`

---

## Prioridade sugerida

Antes de partir pras decorações, valeria corrigir os 3 itens de alta prioridade da seção de bugs (curtidas sem verificação de servidor, comentário duplicando contador, título sem escapar) — são os únicos que afetam dados reais salvos no banco.
