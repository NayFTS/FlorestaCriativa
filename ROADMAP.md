# Roadmap — Floresta Criativa

Organizado por prioridade. Bugs críticos e segurança primeiro, melhorias de UX depois, novas funcionalidades por último.

---

## Fase 1 — Correções Críticas

Problemas que afetam segurança ou funcionamento básico.

- [x] **Verificação de autoria no DELETE `/posts/:id`** — adicionada checagem de sessão e `post.author === userId` (retorna 401/403).
- [x] **Verificação de autoria no POST `/editPost/:id`** — mesma proteção adicionada.
- [x] **`.env` removido do histórico git** — histórico reescrito com `git filter-branch`, credenciais apagadas de todos os commits.
- [x] **`.env` adicionado ao `.gitignore`** — não será commitado novamente.
- [x] **Apagar `index_backup.js`** — arquivo legado com credenciais MySQL em texto puro.
- [x] **Apagar `codigo mongodb provisorio`** — script com credencial antiga do Atlas.
- [x] **Apagar pasta `FlorestaCriativa/`** — cópia duplicada do projeto inteiro na raiz.

---

## Fase 2 — Bugs Visuais e de UX

Problemas anotados no `Alterações e Updates.txt`.

- [x] **Carrossel: centralizar posts quando há menos de 3** — `updateButtons()` agora é chamado após o fetch dos posts reais; placeholders estáticos removidos.
- [x] **Remover linha de borda abaixo do nav** — removida do `styles.css`.
- [x] **Alinhar título e conteúdo dentro de `post.html`** — conteúdo CKEditor movido de `<p>` para `<div class="content-body">` com `line-height: 1.7`; container com `max-width` e centralizado.
- [x] **Adicionar separador visual entre posts** — `#post-list` vira flex coluna com `gap: 20px`; seções deixaram de ser flex-row.
- [x] **Botão de limpar busca** — adicionado em todas as 6 páginas com busca; reseta campo, checkboxes, datas, resultados e fecha filtros.

---

## Fase 3 — Qualidade de Código

Refatorações que não mudam o comportamento mas tornam o código mais fácil de manter.

- [x] **Eliminar código de busca duplicado** — extraído para `public/search.js`; todas as 6 páginas usam `<script src="search.js">`. Fix de produção incluído: calls fetch agora usam `${API_BASE}`.
- [x] **Configurar Tailwind CSS corretamente** — Tailwind não estava sendo usado (`content: []` vazio). Removido via `npm uninstall`, `tailwind.config.js` e `public/tailwind.css` apagados.
- [x] **Mover imagens de CSS para HTML** — N/A: as duas únicas ocorrências (`#top-image`, `#bottom-image`) são padrões decorativos que repetem horizontalmente com `background-repeat: repeat-x`. CSS é a ferramenta correta; `<img>` não replica esse efeito.
- [x] **Centralizar verificação de autenticação** — criado middleware `requireAuth` em `api/index.js`; aplicado em `/user-info`, `/addPost`, `/editPost/:id`, `DELETE /posts/:id`, `/user-posts`, `/dashboard-stats`. Checagens inline removidas.

---

## Fase 4 — Melhorias de UX e Design

Funcionalidades que melhoram a experiência de quem visita ou publica.

- [x] **Editor CKEditor: configurar toolbar completo** — toolbar explícita em `publicar.html` e `editPost.html`: heading, negrito, itálico, sublinhado, link, citação, listas, desfazer/refazer.
- [x] **Preview de imagem antes do upload** — adicionado em `publicar.html` (existia em `editPost.html`); mostra miniatura ao selecionar arquivo. Fix: imagem atual carrega ao abrir edição.
- [x] **Paginação nas seções** — backend suporta `?page=&limit=`; `search.js` ganhou `loadPosts()` com "Carregar mais"; 4 páginas de seção reduzidas a 1 linha cada.
- [x] **Feedback de loading** — texto "Carregando..." pulsante enquanto posts são buscados; animação CSS via `.post-loading`.
- [x] **Tratamento de erro amigável** — `.post-error` com fundo vermelho exibido em falhas de rede; erros de formulário aparecem no `#errorMessage` sem `alert()`; botão desabilitado durante submit.
- [x] **Melhorar mobile: header e nav** — CSS para telas ≤480px: search bar em coluna, toque mínimo 44px no hambúrguer, fontes do header menores, botão "Leia mais" full-width.

---

## Fase 5 — Novas Funcionalidades

Features que expandem o projeto além do que existe hoje.

- [x] **Sistema de rascunhos** — campo `status` no modelo Post; botão "Salvar como rascunho" em `publicar.html`; managePosts exibe badge e botão "Publicar"; rota `PATCH /posts/:id/publish`; rascunhos filtrados em todas as rotas públicas.
- [x] **Slug amigável na URL** — campo `slug` gerado automaticamente do título com `slugify()`; `GET /post/:id` suporta slug ou ObjectId; todos os links do site usam `?slug=` quando disponível; `post.html` aceita `?slug=` e `?id=`.
- [x] **Contagem de visualizações** — campo `views` incrementado a cada `GET /post/:id`; exibido em `post.html`; dashboard mostra total de views e post mais visto.
- [x] **Seção de tags/categorias navegáveis** — N/A: a busca com filtro por categoria já cobre esse caso de uso em todas as páginas de seção.
- [x] **Sitemap e meta tags para SEO** — `post.html` atualiza dinamicamente `<title>`, `og:title`, `og:description`, `og:image` e `meta[name=description]` após buscar os dados do post.
- [x] **Feed RSS** — rota `GET /api/feed.xml`; retorna RSS 2.0 com os 20 posts mais recentes publicados; usa `SITE_URL` env var (ou detecta host automaticamente).
- [x] **Modo escuro** — CSS convertido para variáveis (`--color-bg`, `--color-text`, etc.); `[data-theme="dark"]` com tema florestal noturno; toggle "Modo Escuro/Claro" injetado pelo `search.js` em todas as páginas públicas; preferência salva em `localStorage`; script anti-flash em todos os 13 HTMLs.

---

---

## Fase 6 — Infraestrutura e Segurança

Problemas que afetam o funcionamento real do site em produção.

- [ ] **Migrar uploads para Cloudinary** — o filesystem do Vercel é efêmero; imagens enviadas pelo painel somem a cada redeploy. Integrar o SDK do Cloudinary: upload direto da rota `/addPost` e `/editPost/:id`, salvar URL retornada no campo `image_path`, remover dependência do Multer para disco local.
- [ ] **Rate limiting nas rotas de auth** — `/login`, `/register` e `/reset-password` sem limite de tentativas. Adicionar `express-rate-limit` com janela de 15 min e máximo de 10 tentativas por IP.
- [ ] **Remover registro público e adotar usuário único** — `register.html` é público, mas o site é um blog pessoal com um único autor. Remover a rota `POST /register` e a página `register.html`; criar script `create-user.js` para cadastrar o usuário via terminal; remover link de cadastro do `login.html`.

---

## Fase 7 — Melhorias de UX

Pequenas melhorias que tornam o site mais agradável de usar.

- [ ] **Feedback visual de erro no login** — destacar os campos de e-mail/senha com borda vermelha e mensagem de erro mais visível quando o login falha.
- [ ] **Paginação no managePosts** — carregar posts em lotes no painel de gerenciamento para não travar com muitos posts.
- [ ] **Confirmação antes de excluir post** — substituir o comportamento atual por um modal de confirmação em vez de deletar imediatamente ao clicar.
- [ ] **Exibir imagem atual no editPost** — mostrar thumbnail da imagem já salva ao abrir a edição, não apenas após selecionar uma nova.

---

## Notas

- A ordem das fases é uma sugestão. Fases 1 e 2 são as mais urgentes.
- O roadmap deve ser revisado sempre que novas ideias ou problemas surgirem.
- Bugs novos encontrados em produção entram na Fase 1 ou 2 dependendo da gravidade.
