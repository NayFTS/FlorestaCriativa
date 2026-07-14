# Auditoria — Floresta Criativa (13 jul 2026)

Atualização da auditoria de 07/07/2026, considerando os commits `35cb68d` → `a100cd2` (categoria no editar/publicar, fallback do carrossel, widget Featured dinâmico, divisores decorativos na sidebar, nomes originais no topbar, header de widgets estilo janela, header mobile completo, correção de conexões MongoDB) e a correção de `connectWithRetry` aplicada em `api/index.js` na sessão anterior a esta.

Nada foi alterado durante essa auditoria — é só leitura e mapeamento.

---

## Correção de MongoDB (já aplicada e verificada)

`api/index.js:43-93` — `connectWithRetry` está coerente: 3 tentativas com 1s de intervalo, reseta `global.__mongoConnectPromise` só quando todas falham, `MongoStore` consome a mesma promise via `clientPromise`. Limitação inerente ao padrão (não é bug): se as 3 tentativas falharem, a instância "quente" do Lambda fica com sessão quebrada até um cold start novo — o retry só cobre falhas transitórias, como o próprio comentário no código já avisa.

---

## 1. Bugs de backend

### Alta
1. **`api/index.js` `/addPost` e `/editPost/:id` (linhas 307-379)** — Nenhuma validação de `title`/`content`/`url` no servidor (diferente de `/login`, `/comments`, `/guestbook`, `/admin/settings`, que usam `express-validator`). O único guarda é o `required` do HTML, contornável via chamada direta à API. Um post com `title` vazio vira slug genérico `"post"` e title `""`, quebrando `<h2>${title}</h2>` em toda página que exibe o post.

### Média
2. **`/admin/comments/:id/approve`, `DELETE /admin/comments/:id`, `/admin/guestbook/:id/approve`, `DELETE /admin/guestbook/:id` (linhas 695-781)** — Não validam `mongoose.Types.ObjectId.isValid(id)` antes de consultar, diferente de `/posts/:id/like`, `/unlike`, `/publish`, `DELETE /posts/:id`, `/posts/:id/data` (essas já foram corrigidas). Id malformado vira 500 genérico em vez de 400.
3. **`/dashboard-stats`, `/user-posts` (linhas 549-582)** — Ainda carregam `Post.find({})` inteiro na memória pra somar contadores; "mais popular" só olha `views`, ignora `likes`/`commentsCount`.

### Baixa
4. **`GuestbookEntry` schema (linhas 122-127) vs `index.html` 452-455** — Backend aceita `author` até 60 e `message` até 500 caracteres, mas o formulário (compactado no commit `2832072`) limita a 10 e 50 no HTML. Chamada direta à API ainda grava textos maiores do que o card foi desenhado pra exibir.
5. **`package.json`** — `"main": "index.js"` aponta pra um arquivo que não existe na raiz (entrypoint real é `api/index.js`, referenciado em `vercel.json`). Inofensivo, mas é metadado incorreto.

---

## 2. Bugs de frontend/JS

### Alta
1. **`dashboard.html:257,274`, `managePosts.html:232`** — Título do post (e `mostPopularPost`) inseridos via `innerHTML` **sem escapar**, diferente de `post.html`/`search.js` (já usam `escapeHtml`/`_escapeHtmlGlobal`). `dashboard.html` até define `escapeHtml` localmente (linha 285-289) e usa corretamente na moderação de comentários — só não aplica nesses três pontos. Risco prático baixo hoje (só a autora cria posts), mas um título com `"` ou `<` já quebra a própria página admin, e é vetor de XSS se a conta admin for comprometida.

### Baixa
2. **`editPost.html:264`, `publicar.html:343`** — Tags de tecnologia renderizadas sem escapar no editor administrativo. Mesmo padrão do item acima, exposição mínima.
3. **`styles.css` 1509-1581 (Now Playing)** — Controles ⏮ ▶ ⏭ continuam sem `addEventListener` em `search.js` — decorativos, sem funcionar.

---

## 3. Inconsistências visuais/UX entre páginas

### Alta
1. **`login.html`** — Única página "pública" sem `class="page-public"` no `<body>` (linha 18). Efeitos:
   - Topbar/sidebar ficam com visual "quadrado" antigo (sem `border-radius`, sem o cartão flutuante que as outras 6 páginas públicas têm).
   - `search.js:61` (`injectCornerVines`) não injeta as vinhas decorativas nos cantos (checa `body.page-public`).
   - Sidebar footer (linha 58-60) ainda mostra link "Login" old-style em vez do ícone GitHub que as outras páginas já mostram no mesmo espaço.
   - Resultado: página fica num estado híbrido, sem nenhuma das melhorias de chrome do redesign recente.

### Média
2. **`login.html` sidebar-widgets (linha 56)** — Tem o sticker `sapo-sentado.png`, igual às páginas admin, mas nenhuma das 6 páginas públicas tem esse sticker — reforça o estado "nem admin nem público".

---

## 4. Funcionalidade faltando / incompleta

### Média
1. **`sapo-imaginario.html` "Tools I Use"/"Skills & Services" (linhas 192-212)** — Conteúdo fixo no HTML, não vem de `/settings` como Currently/Now Playing. Implementação parcial se a intenção era ficar editável pelo dashboard.
2. **`sobre-mim.html` "My Tools"/"Things That Matter" (linhas 290-313)** — Mesmo padrão, conteúdo fixo.

### Baixa
3. **`post.html` mobile** — O botão "← Voltar" foi escondido inteiramente abaixo de 768px (em vez de reposicionado) ao resolver o conflito com o botão de hambúrguer — hoje não há botão de voltar visível no post em mobile. Vale confirmar se foi intencional.

---

## 5. Código morto / lixo

### Média
1. **`vercel-dev.log`** (raiz, commitado no `a100cd2`) — 783 linhas de log de dev, foram parar no commit por engano. Sem segredos expostos.
2. **`public/imagens/temp/Captura de tela 2026-07-08 122929.png`** (commitado no `a100cd2`) — Screenshot de trabalho, também parece ter entrado sem querer.

### Baixa
3. **`styles.css` 3792-3810 (`.hamburger`)** — Regra sem HTML correspondente (botão real usa `.drawer-toggle`).
4. **`styles.css` 2265-2273 (`#registerLink`)** — Regra para elemento que não existe em nenhuma página.
5. **`.env` / segredos** — Verificado: `.env` está no `.gitignore`, não rastreado pelo git. Nenhum segredo commitado encontrado.

---

## 6. Já resolvido desde a auditoria de 07/07

- Curtidas sem verificação de servidor → `req.session.likedPosts` bloqueia duplicidade por sessão.
- Aprovar comentário duas vezes duplicava contador → guard `if (!comment.approved)` antes de incrementar.
- Título/tecnologias/alt sem escapar em `post.html`/`search.js` → corrigido nesses dois arquivos (reapareceu em `dashboard.html`/`managePosts.html`, ver seção 2).
- Like/unlike/publish/delete sem validar ObjectId → corrigido nessas 4 rotas (mesma lacuna ainda existe em `/admin/comments/*` e `/admin/guestbook/*`, ver seção 1).
- Categorias duplicadas em `search.js` → dedup com `[...new Set(...)]`.
- Sem como despublicar um post → `editPost.html` agora tem `<select id="status">`.
- `models/Post.js` morto e `dist/styles.css` obsoleto → removidos do repo.
- CSS órfão (`.footer-content`, `.search-container`, `.section-divider`, `.sticker-pill`, `.widget-quicklinks`, `#header-image`) → removido (só `.hamburger`/`#registerLink` sobraram, ver seção 5).
- `class="active"` fixo em `sobre-mim.html` → depende só de `markActiveNavLinks()`.
- `mongodb` como dependência direta não usada → removido do `package.json`.
- Conflito hambúrguer/botão voltar em `post.html` mobile → resolvido (mas ver item novo na seção 4).
- Drawer e busca não se fechavam um ao outro → `toggleDrawer()`/`toggleSearch()` agora fecham mutuamente.
- Breakpoints 768px/600px brigando na tabela de posts → resolvido, com comentário no CSS.
- Guestbook com breakpoint 700px vs nav 768px → unificado em 768px.
- Admin sem link de volta ao Dashboard, bottom-nav de 4 itens, drawer sem widgets → todos resolvidos.
- Gaps de mockup (filtro de categoria, ordenação, sidebar de widgets em Verde Inspiração/Rascunhos/Sapo Imaginário, Quick Facts/Things I Love/Journey em Sobre Mim, Featured dinâmico, fallback de carrossel) → todos implementados.

---

## Prioridade sugerida

1. Validar `title`/`content`/`url` no servidor em `/addPost` e `/editPost/:id`.
2. Escapar HTML em `dashboard.html`/`managePosts.html` (título do post, mais visualizado).
3. Aplicar `class="page-public"` (ou o tratamento equivalente) em `login.html` pra alinhar com o resto do chrome público.
