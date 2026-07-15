# Auditoria — Floresta Criativa (14 jul 2026)

Atualização da auditoria de 13/07/2026, considerando os commits `47b6c0c` (validação de
title/content/url, escape de HTML no admin, login alinhado ao chrome público) e `905a34a`
(CKEditor no modo escuro, sticker sapo-sentado em todas as páginas públicas, overrides do
OverlayScrollbars).

Nada foi alterado durante essa auditoria — é só leitura e mapeamento.

---

## Resolvido desde a auditoria de 13/07

Os 3 itens de prioridade alta da auditoria anterior foram corrigidos e verificados:

1. **Validação de `title`/`content`/`url`** — `postValidators` (`api/index.js:307-311`) agora
   valida via `express-validator` em `/addPost` (313) e `/editPost/:id` (345), mesmo padrão de
   `/login`, `/comments`, `/guestbook`.
2. **Escape de HTML no admin** — `dashboard.html` e `managePosts.html` agora usam `escapeHtml()`
   em título de post e "mais visualizado".
3. **`login.html` alinhado ao chrome público** — `<body class="page-public">` presente; vinhas
   decorativas, cartão flutuante e link GitHub no lugar do "Login" antigo.

**Bônus não listado como prioridade, mas também resolvido:** a inconsistência do sticker
`sapo-sentado.png` (antes só em `login.html` entre as páginas públicas) foi resolvida no commit
`905a34a` — o sticker agora aparece na sidebar desktop de **todas** as páginas públicas (index,
login, sobre-mim, sapo-imaginario, rascunhos-da-floresta, post, verde-inspiracao), igual às
páginas internas. Confirmado via grep: 11 arquivos HTML têm o sticker, incluindo as 7 páginas
públicas.

**Resolvido nesta sessão:** `ObjectId.isValid()` adicionado nas 4 rotas de admin que faltavam
(`/admin/comments/:id/approve`, `DELETE /admin/comments/:id`, `/admin/guestbook/:id/approve`,
`DELETE /admin/guestbook/:id`), mesmo padrão já usado nas outras 5 rotas — id malformado agora
retorna 400 em vez de 500 genérico.

---

## Correção de MongoDB (já aplicada, ainda coerente)

`api/index.js:53-93` — `connectWithRetry`: 3 tentativas com 1s de intervalo, reseta
`global.__mongoConnectPromise` só quando todas falham, `MongoStore` consome a mesma promise via
`clientPromise`. Sem mudanças desde a última auditoria.

---

## 1. Bugs de backend

### Média
1. **`/dashboard-stats` (573), `/user-posts` (563)** — Ainda carregam `Post.find({})` inteiro na
   memória pra somar contadores; "mais popular" só olha `views`, ignora `likes`/`commentsCount`.

### Baixa
2. **`GuestbookEntry` schema (`api/index.js:122-127`) vs `index.html:455,457`** — Backend aceita
   `author` até 60 e `message` até 500 caracteres, mas o formulário HTML limita a 10 e 50.
   Chamada direta à API ainda grava textos maiores do que o card foi desenhado pra exibir.
3. **`package.json:4`** — `"main": "index.js"` aponta pra um arquivo que não existe na raiz
   (entrypoint real é `api/index.js`, referenciado em `vercel.json`). Inofensivo, metadado
   incorreto.

---

## 2. Bugs de frontend/JS

### Baixa
1. **`styles.css:1563-1635` (Now Playing)** — Controles `.np-control--prev`/`.np-control--next`
   (`index.html:421,428`) continuam sem `addEventListener` — `search.js:269` só liga o ícone de
   play/pause ao estado real do Spotify, prev/next são puramente decorativos.

**Resolvido nesta sessão:** tags de tecnologia em `editPost.html`/`publicar.html` agora passam
por `escapeHtml()` antes de entrar via `innerHTML`, mesmo padrão já usado pro título do post.
Aproveitando a mudança, também foi adicionado um campo de **categoria personalizada** (botão "+
Adicionar categoria") nos dois formulários, além das 5 categorias fixas em checkbox — as
categorias digitadas viram chips removíveis, escapados do mesmo jeito, e são mescladas às
categorias marcadas no envio do form. Em `editPost.html`, categorias já salvas no post que não
batem com nenhum checkbox fixo (ex.: categoria personalizada de uma edição anterior) agora viram
chip em vez de serem perdidas silenciosamente ao salvar de novo.

---

## 3. Inconsistências visuais/UX entre páginas

Nenhuma pendência nova encontrada. A inconsistência do `login.html` (chrome público e sticker)
foi resolvida — ver seção "Resolvido" acima.

---

## 4. Funcionalidade faltando / incompleta

### Média
1. **`sapo-imaginario.html:195` "Tools I Use"/"Skills & Services"** — Conteúdo fixo no HTML, não
   vem de `/settings` como Currently/Now Playing. Implementação parcial se a intenção era ficar
   editável pelo dashboard.
2. **`sobre-mim.html:294,305` "My Tools"/"Things That Matter"** — Mesmo padrão, conteúdo fixo.

### Baixa
3. **`post.html` mobile** — `.back-button-container` (`styles.css:2262-2269`) segue com
   `display: none` no breakpoint mobile — não há botão de voltar visível no post em mobile. Vale
   confirmar se foi intencional.

---

## 5. Código morto / lixo

### Média
1. **`vercel-dev.log`** (raiz, ainda rastreado pelo git, 37KB) — log de dev que entrou por
   engano no commit `a100cd2`, continua no repositório. Sem segredos expostos, mas não deveria
   estar versionado.
2. **`public/imagens/temp/Captura de tela 2026-07-08 122929.png`** — Já está marcado como
   deletado no working tree (não commitado ainda, ver `git status`). Falta só commitar a
   remoção.

### Baixa
3. **`styles.css:3859 (.hamburger)`** — Regra sem HTML correspondente (nenhuma página usa
   `class="hamburger"`; botão real usa `.drawer-toggle`).
4. **`styles.css:2292 (#registerLink)`** — Regra para elemento que não existe em nenhuma página.
5. **`.env` / segredos** — Verificado de novo: `.env` está no `.gitignore`, não rastreado.
   Nenhum segredo commitado encontrado.

---

## Prioridade sugerida

1. Commitar a remoção do screenshot temp e adicionar `vercel-dev.log` ao `.gitignore` (+ remover
   do índice).
