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

Nenhuma pendência aberta no momento — o item de baixa prioridade (controles decorativos do Now
Playing) foi resolvido, ver "Resolvido" abaixo.

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

**Resolvido desde a última auditoria:** "Tools I Use"/"Skills & Services" (`sapo-imaginario.html`)
e "My Tools"/"Things That Matter" (`sobre-mim.html`) agora carregam via `/settings` e são
editáveis pelo dashboard (commits `738a76a` e `0ffead0`), mesmo padrão de Currently/Now Playing.
Como parte do mesmo trabalho, os controles decorativos `.np-control--prev`/`.np-control--next` do
Now Playing (item da seção 2 na auditoria anterior) foram removidos.

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

## Prioridade sugerida (14/07, já resolvida)

1. ~~Commitar a remoção do screenshot temp e adicionar `vercel-dev.log` ao `.gitignore` (+ remover
   do índice).~~ Resolvido no commit `42ea8a0`.

---

## Adendo — deixado de propósito pro futuro (17/07)

Dois itens de baixa prioridade que já foram identificados e discutidos, mas ficam pendentes por
decisão consciente (não é esquecimento):

1. **`post.html` mobile** — `.back-button-container` (`styles.css:2262-2269`) segue com
   `display: none` no breakpoint mobile — não há botão de voltar visível no post em mobile.
2. **CSS morto** — `.hamburger` (`styles.css:3859`) e `#registerLink` (`styles.css:2292`) sem
   nenhum HTML correspondente em nenhuma página.

---

# Auditoria completa — Floresta Criativa (17 jul 2026)

Pente-fino no projeto inteiro, backend e frontend, feito em duas frentes paralelas e depois
verificado a dedo (lendo o código atual) antes de registrar. Nada foi alterado além de dois bugs
triviais corrigidos inline (marcados abaixo) — o resto é só leitura e mapeamento, para decidir
prioridade depois.

## 1. Backend (`api/index.js`)

### Alta

1. **`/search` — `q` vai direto pro `$regex` sem escapar (linhas 552-562)**. Confirmado lendo o
   código: um caractere especial de regex (`(`, `*`, `+`...) na busca pública quebra a query e
   devolve 500 em vez de "nenhum resultado"; um padrão tipo `(a+)+$` como termo de busca abre
   espaço pra ReDoS contra o campo `content` (que pode ter milhares de caracteres), num endpoint
   público sem rate limit. Falta escapar `q` antes de montar o filtro.
2. **Cookie de sessão sem `secure`/`sameSite` (linha 84-93)**. Confirmado: `cookie: { maxAge: ... }`
   não define nenhum dos dois. É a sessão que carrega `isAdmin`, protegendo todas as rotas
   `requireAuth` (posts, settings, guestbook, comments) — e nenhuma dessas rotas de mutação tem
   token CSRF, só o `SameSite` implícito do navegador como barreira.

### Média

3. **Views de post infláveis, sem limite nem dedupe (linhas 468-483)** — ao contrário de
   `/posts/:id/like`, que tem `likeLimiter` e checa `req.session.likedPosts` pra não contar duas
   vezes, `GET /post/:id` incrementa `views` livremente. Um script repetindo a chamada infla
   `views` artificialmente — e isso alimenta direto o "post mais popular" que acabamos de calcular
   via `views + likes + commentsCount`.
4. **Imagens do Cloudinary nunca são apagadas**. Confirmado por grep: não existe nenhuma chamada a
   `cloudinary.uploader.destroy` no projeto. `DELETE /posts/:id`, trocar a capa em
   `POST /editPost/:id` e remover fotos da galeria deixam as imagens antigas órfãs no Cloudinary
   pra sempre — cresce sem controle e sem rota de limpeza.
5. **`POST /comments` não confere se o post existe (linhas 710-726)** — só valida formato de
   ObjectId, nunca busca o `Post`. Dá pra comentar num post deletado ou inexistente; o
   `$inc: commentsCount` na aprovação roda um update que silenciosamente não faz nada.

### Baixa

6. `/search` não dá `trim()`/`filter()` nas categorias como `/posts` já faz — filtrar com espaço
   depois da vírgula funciona num endpoint e falha silenciosamente no outro.
7. `/search` não pagina (`/posts` sim) — devolve a lista inteira sempre.
8. `POST /editPost/:id` nunca regenera o `slug` ao mudar o título — pode ser proposital (não
   quebrar links antigos), vale só confirmar que é intencional.
9. `SESSION_SECRET` tem fallback hardcoded (`'fallback_secret'`) se a env var não estiver setada —
   defesa fraca caso o deploy esqueça de configurar.
10. `getSettingsWithSpotifyToken`/`isSpotifyConnected` fazem a mesma query duas vezes de formas
    ligeiramente diferentes — dava pra ser uma função só.
11. **Comments não tem archive/restore como Guestbook ganhou** — só `approve` e delete definitivo.
12. Filas de pendentes (`/admin/comments/pending`, `/admin/guestbook/pending`) não paginam,
    diferente da lista de aprovados do guestbook (que já pagina).
13. `/user-posts` ainda carrega a coleção inteira sem paginação (carryover do audit de 14/07).

## 2. Frontend (HTML/CSS/JS)

### Média

1. **Link "Guestbook" do menu mobile quebrado em 10 das 11 páginas** — `href="#guestbook"` em
   `sobre-mim.html`, `sapo-imaginario.html`, `rascunhos-da-floresta.html`, `verde-inspiracao.html`,
   `post.html`, `login.html`, `dashboard.html`, `publicar.html`, `managePosts.html`,
   `editPost.html` (todas linha ~90-97) não navega pra lugar nenhum — só `index.html` tem
   `id="guestbook"`. `livro-de-visitas.html` já corrigiu isso (`index.html#guestbook`); falta
   replicar o mesmo padrão nas outras 10.
2. **`deleteGuestbookEntry` sem `.catch()` e sem desabilitar o botão** — bug meu desta sessão,
   **já corrigido inline** durante esta auditoria (`dashboard.html`): agora desabilita o botão
   "Excluir" durante a requisição e trata erro de rede, mesmo padrão de archive/unarchive.
3. **`verde-inspiração`/`rascunhos-da-floresta` sem sidebar de widgets**, ao contrário do
   Sapo Imaginário (que tem Featured/Tools/Skills/Recent Updates) — as três são listagens de post
   do mesmo tipo, só uma tem sidebar. Vale decidir se é intencional ou se ficou pra trás.
4. **Busca avançada não inclui categorias personalizadas** — o filtro de categoria no overlay de
   busca é hardcoded com as 5 categorias fixas; posts com categoria personalizada (feature que
   adicionamos em `editPost`/`publicar`) não aparecem nesse filtro, embora os "pills" das páginas
   de listagem já busquem categorias dinamicamente.
5. **Projetos nunca mostram sua categoria em `post.html`** — o formulário atribui categoria a todo
   post (inclusive projetos, usada nos pills de filtro do Sapo Imaginário), mas o branch de
   exibição de projeto em `post.html` nunca renderiza os chips de categoria.

### Baixa

6. `publicar.html`/`editPost.html` sem favicon/manifest no `<head>` (as outras 10 páginas têm).
7. CSS morto: `.post-categories` (`styles.css:3548`) e `.no-comments` (`styles.css:4650`) sem
   elemento correspondente.
8. Lógica de logo dia/noite duplicada em 3 lugares (`.topbar-sign`, `.sidebar-logo`,
   `.mobile-topbar-sign`) — poderia ser uma classe utilitária única.
9. **i18n é praticamente decorativo** — o botão de idioma aparece em todas as páginas, mas o
   dicionário de traduções só cobre o overlay de busca e o widget de mood; clicar em "EN" não
   traduz nav, títulos, formulários etc. Parece fazer mais do que faz.
10. **RSS (`/feed.xml`) existe no backend mas não tem nenhum link visível em lugar nenhum do
    site** — quem não souber a URL de cor nunca vai descobrir que a feature existe.

## 3. Ideias de melhorias e diversão

Nada aqui é bug — é brainstorm pra deixar o site mais bonito/gostoso de usar, aproveitando o que já
existe (clima real no mood card, cartas do guestbook, Garden Log automático):

1. **Selo/carimbo aleatório nas cartas do livro de visitas** — cada mensagem em
   `livro-de-visitas.html` ganha um "selo" decorativo (cor/ícone sorteado) além do postmark de
   data, pra parecer mais uma correspondência de verdade e menos uma lista repetitiva.
2. **Reação rápida (♡) nas cartas**, sem precisar escrever uma mensagem — caminho de engajamento
   mais leve pra quem só quer deixar um carinho rápido.
3. **Contador tipo "N sapinhos já passaram por aqui"** no topo do livro de visitas — nostalgia de
   contador de visitas de guestbook antigo, encaixa no tom do site.
4. **Easter egg no sapinho da sidebar** — cliques acumulados (guardados no localStorage) disparam
   uma animação ou mensagem secreta depois de N cliques.
5. **Botão "Me surpreenda"** — sorteia e abre um post aleatório (ícone de trevo/dado), bom pra
   quem não sabe por onde começar a explorar o blog.
6. **Estações do ano sutis no visual** — já existe clima real influenciando o mood card; dava pra
   estender isso com detalhezinhos de CSS (folhas caindo, vagalumes à noite) casando com a estação
   atual, sem exigir nada novo de infra.
7. **Divulgar o RSS** — já existe (`/feed.xml`), só falta um ícone/link em algum canto (rodapé ou
   sidebar) pra quem usa leitor de feed encontrar.
8. **Transição de página com uma pegada de sapinho saltando** — polimento visual barato,
   reforçando a identidade sem precisar de biblioteca nova.

## Resumo de prioridade sugerida (17/07)

1. ~~Escapar `q` no `/search` antes do `$regex` (Alta).~~ Resolvido no commit `2617fde`
   (`escapeRegex()` aplicado antes de montar o filtro `$or`).
2. ~~`secure`/`sameSite` no cookie de sessão (Alta).~~ Resolvido no commit `2617fde`
   (`trust proxy` habilitado, cookie com `secure: NODE_ENV === 'production'` e `sameSite: 'lax'`).
3. Corrigir os 10 links `#guestbook` quebrados no menu mobile (Média, mecânico).
4. `cloudinary.uploader.destroy` ao apagar/trocar imagem (Média).
5. Rate limit/dedupe em views, ou aceitar que "mais popular" é manipulável (Média).
6. Validar existência do post em `POST /comments` (Média).
7. Resto por ordem de interesse — nada aqui é urgente.

**Bônus não listado como prioridade, mas também resolvido:** botões "Pesquisar"/"Filtros"/
"Limpar" do overlay de busca usavam o estilo padrão do navegador (cinza, quadrado); agora seguem
a identidade visual do site (`public/styles.css`, commit `2617fde`).
