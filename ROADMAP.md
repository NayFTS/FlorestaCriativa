# Roadmap — Floresta Criativa

---

## Concluído

| Fase | Descrição |
|------|-----------|
| 1 | Correções críticas de segurança e estrutura |
| 2 | Bugs visuais e de UX |
| 3 | Qualidade de código (search.js, remoção do Tailwind, centralização de auth) |
| 4 | UX: paginação, preview de imagem, CKEditor completo, loading states |
| 5 | Rascunhos, slugs, views, meta OG, RSS, modo escuro |
| 6 | Cloudinary, remoção do registro público, rate limiting, roteamento Vercel |
| 9 | Tempo de leitura, posts relacionados, botão compartilhar |
| 10 | Sapo Imaginário: grid de projetos, preview drawer, tech badges, campos externos |
| 11 | Layout diferenciado no post.html para posts do Sapo Imaginário |
| 12 | Galeria de imagens: upload múltiplo, grid clicável, lightbox com teclado |
| 13 | Sistema de comentários com moderação e rate limiting |
| — | Redesign completo: nova paleta, sticky footer, navbar padronizada em todas as páginas, about me integrado na home, roleta integrada ao design |
| — | Remoção da Roleta do site — agora é um projeto próprio no GitHub, publicado separadamente na nuvem |
| 15 | UX pendente: paginação, modal de exclusão, feedback de login, placeholder de carrossel vazio |

---

## Correções Imediatas (bugs encontrados na leitura de código — 2026-07-04)

- [x] **Imagem de fallback do carrossel quebrada** — `index.html` agora aponta pra `imagens/quadrado-da-floresta.webp` (hífen), igual ao arquivo real.
- [x] **`models/Post.js` era código morto** — removido (`api/index.js` já define seus próprios schemas inline). `models/User.js` também foi removido junto com a simplificação de auth abaixo.
- [x] **Categorias com espaço agora são url-encoded na busca** — `search.js` encoda cada categoria individualmente antes de montar a URL.
- [x] **Carrossel sem posts** — home agora mostra uma mensagem amigável quando não há posts publicados, em vez de ficar vazia.
- [x] **Auth simplificada para admin único com credenciais fixas (2026-07-04)** — o site tem só um usuário administrador, então todo o sistema de conta (registro, criação de usuário via script, reset de senha por chave secreta) foi removido em favor de um login fixo:
  - Removidos: `create-user.js`, `models/User.js`, `public/register.html`, `public/reset-password.html`, rotas `POST /register` e `POST /reset-password`.
  - `/login` agora valida contra `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (bcrypt) no `.env`, sem consultar o MongoDB.
  - Checagens de "dono do post" (`post.author` vs `session.userId`) removidas de todas as rotas — não fazem sentido com um único admin.
  - `public/login.html`: campo trocado de email para usuário.
  - [ ] **Pendente antes do deploy:** configurar `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH` nas Environment Variables do Vercel (produção) e remover `RESET_SECRET` de lá — hoje essas variáveis só existem no `.env` local.
- [x] **Bug: banco de dados errado localmente (2026-07-04)** — o `.env` local especificava `/floresta_criativa` como nome do banco no `MONGO_ATLAS`, mas a produção (Vercel) usa a connection string sem nome de banco, caindo no banco padrão `test` — onde os posts reais estão. Local via banco vazio, parecia que não havia posts. Corrigido removendo o nome do banco do `.env` local para bater com produção.

### Status real da Fase 15 (ROADMAP estava desatualizado)
Conferindo o código, os itens abaixo **já foram implementados** e não constavam como concluídos:
- [x] Paginação no managePosts (client-side, 10 por página)
- [x] Modal de confirmação customizado no delete (`#deleteModal` em managePosts.html)
- [x] Feedback visual de erro no login (`.input-error` nos campos)
- [x] Carrossel sem posts (placeholder — corrigido acima)

Fase 15 concluída — movida pra tabela "Concluído" acima.

---

## Próximas Fases

> Fase 14 (tipografia) foi absorvida pela **Fase 21** do redesign — removida daqui pra não duplicar.

### Fase 16 — Categorias Navegáveis
- [ ] Clicar em uma categoria (no card ou no post) redireciona para uma listagem filtrada
- [ ] URL amigável: `verde-inspiracao.html?categoria=Animes`
- [ ] Breadcrumb "Categoria: Animes" no topo da listagem filtrada

---

### Fase 17 — Performance e SEO
- [ ] `sitemap.xml` gerado dinamicamente pela API
- [ ] `robots.txt` na raiz
- [ ] Lazy loading no carrossel já existe — revisar outras imagens do site
- [ ] Minificação de `styles.css` e `search.js` no build (ou via Vercel)
- [ ] Score Lighthouse: atingir 90+ em Performance e SEO

---

### Fase 18 — Dashboard Aprimorado
- [ ] Gráfico de visualizações por post (últimos 30 dias)
- [ ] Contagem de comentários pendentes visível na entrada do dashboard
- [ ] Exportar posts como JSON (backup simples)
- [ ] Botão "Duplicar post" para reaproveitar estrutura

---

### Fase 19 — Acessibilidade
- [ ] Atributos `aria-label` e `role` em todos os elementos interativos
- [ ] Navegação completa por teclado (foco visível, trap de foco no modal de busca)
- [ ] Contraste mínimo WCAG AA verificado nas duas paletas (claro e escuro)
- [ ] `alt` descritivo em todas as imagens de post (hoje usa o título)

---

### Fase 20 — Mobile e PWA
- [ ] Menu hambúrguer com animação de transição suave — absorvido pela **Fase 22**
- [ ] Swipe no carrossel da home (já tem toque, mas refinar a sensibilidade)
- [ ] `manifest.json` e ícones para adicionar à tela inicial
- [ ] Service worker para cache básico offline

---

## Redesign "Floresta Criativa" — nova identidade visual

Baseado nos mockups em `public/imagens/UX Design/` (versões desktop e mobile), no sticker sheet de referência, e no **design system NAYFTS completo** documentado em [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (paleta exata, tipografia, componentes, animações, seções e conceito geral). Mantém o nome **Floresta Criativa** — a estética sapo/floresta é a nova linguagem visual do site, não uma troca de marca. Escopo: reskin completo + reorganização de navegação + novas funcionalidades (guestbook, widgets pessoais). Essas fases substituem/absorvem as Fases 14 e 20 (menu hambúrguer) listadas acima.

> Sempre que uma fase daqui pra baixo mexer em cor, fonte, borda, sombra ou espaçamento, consultar `DESIGN_SYSTEM.md` como fonte de verdade dos valores exatos.

### Fase 21 — Fundação visual (design tokens) ✅ concluída (2026-07-04)
- [x] Paleta definitiva (light/dark) do `DESIGN_SYSTEM.md` aplicada em `--color-*` no `styles.css`
- [x] Tipografia: `Fredoka` (títulos/logo), `Quicksand` (navegação/UI geral), `Patrick Hand` (corpo dos posts — `.content-body`, efeito de diário escrito à mão), `JetBrains Mono` (código)
- [x] Sistema de cards "sticker" (`.sticker-card`, `.sticker-card--sm`, `.sticker-pill`): `border-radius` 20px/16px, borda 2px `--color-border`, sombra suave — definido no CSS, pronto pra ser aplicado nas próximas fases (ainda não usado nas páginas)
- [x] Textura de papel/noise discreta (2% claro / 5% escuro) via SVG `feTurbulence` sobre o fundo
- [x] Tokens revisados também no modo escuro (`[data-theme="dark"]`)
- [ ] Ilustrações: extrair/recortar elementos do sticker sheet (folhas, sapinhos, moldura de placa) como decorações reutilizáveis (SVG/PNG com fundo transparente) — adiado, entra como parte das próximas fases que já usam doodles (ver `DESIGN_SYSTEM.md`)

### Fase 22 — Navegação redesenhada ✅ concluída (2026-07-04)
- [x] Desktop: sidebar fixa à esquerda (logo + navegação), inspirada no mockup 3 (`14_03_16`) — aplicada em todas as páginas públicas (`index`, `sobre-mim`, `verde-inspiracao`, `sapo-imaginario`, `rascunhos-da-floresta`, `post`). Slot de widgets fica pra Fase 25 (widgets ainda não existem)
- [x] Mobile: bottom nav fixo (Home / Verde / Sapo / Rascunhos) + drawer lateral no hambúrguer com navegação completa (mockup 1, `14_03_09`)
- [x] Reorganizada a navegação principal: Home · Verde Inspiração · Sapo Imaginário · Rascunhos da Floresta · Sobre Mim — **Guestbook adiado do menu** até a Fase 24 implementar a página (evita link quebrado)
- [x] "Sobre Mim" ganhou página própria (`public/sobre-mim.html`) — home agora tem só um teaser clicável
- [x] Estado ativo detectado automaticamente via JS (`markActiveNavLinks` em `search.js`, compara `location.pathname`), sem precisar mais hardcodar `class="active"` por página
- Páginas administrativas (login/dashboard/publicar/managePosts/editPost) mantidas com o nav horizontal antigo por enquanto — reskin delas é escopo da Fase 27
- Nota técnica: `.sidebar-nav`/`.bottom-nav` usam `<div role="navigation">` em vez de `<nav>`, pra não herdar os estilos do `<nav>` horizontal antigo (usado nas páginas admin)

### Fase 23 — Home redesenhada ✅ concluída (2026-07-04)
- [x] Hero "bem-vinda ao meu cantinho 🐸" — banner existente restilizado como sticker-card (cantos arredondados, sombra), texto do mockup 2/3
- [x] Bloco "últimos posts" — mesmo carrossel/`_build` de sempre, só reskinado (`#posts-recentes` agora usa `--radius-card`/`--shadow-card`; corrigido bug de fonte antiga `Lora` hardcoded no título do card)
- [x] Sidebar de widgets (desktop, coluna direita) / carrossel horizontal (mobile, `overflow-x:auto` com scroll-snap): Links Rápidos, Currently, Now Playing, Garden Log
- [x] **Garden Log é dinâmico** — puxa os posts recentes reais da API (`/recent-posts`), sem modelo novo, como sugerido na Fase 25
- Currently e Now Playing usam **conteúdo estático de placeholder** (marcado com comentário HTML no `index.html`) — troque pelo status real quando quiser; isso já cobre boa parte da Fase 25 V1
- Now Playing é só visual (não toca áudio de verdade) — um player funcional fica pra uma fase futura, se quiser

### Fase 24 — Guestbook (novo recurso) ✅ concluída (2026-07-04)
- [x] Modelo `GuestbookEntry` (author, message, createdAt, approved) — mesmo padrão de moderação do `Comment`
- [x] `POST /guestbook` público com rate limit próprio (`guestbookLimiter`, 5/h — mesmo padrão do `commentLimiter`)
- [x] `GET /guestbook` retorna só aprovados (20 mais recentes)
- [x] Seção de moderação no dashboard (`#pendingGuestbookWrap`), reaproveitando a UI que já existe para comentários pendentes
- [x] Seção "guestbook" na home com formulário + últimas mensagens aprovadas
- [x] Link "Guestbook" adicionado de volta ao menu (sidebar/drawer, `index.html#guestbook`) em todas as páginas públicas — estava adiado desde a Fase 22 até essa página existir de verdade
- Testado end-to-end: envio público → aparece pendente no dashboard → aprovar → aparece na home; rejeitar/deletar também testado
- Bug encontrado e corrigido durante o teste: o listener do formulário (`addEventListener`) rodava antes da seção existir no DOM (script ficava antes do HTML da seção) — corrigido movendo a inicialização pra dentro do `window.onload`

### Fase 25 — Widgets pessoais (currently / mood / now playing / garden log) ✅ concluída (2026-07-04)
- [x] ~~V1: conteúdo estático~~ — pulado direto pro V2, já que era pouco esforço a mais
- [x] "Garden log" derivado automaticamente dos posts publicados recentes (feito na Fase 23, sem modelo novo)
- [x] **V2: configurações do site editáveis pelo dashboard** — modelo `SiteSettings` (singleton), `GET /settings` (público) e `PUT /admin/settings` (autenticado)
- [x] Widget **Mood** adicionado (fazia falta desde a Fase 23) — emoji + humor, editável
- [x] Currently e Now Playing (Fase 23) agora são dinâmicos, puxando de `/settings` em vez de hardcoded
- [x] Formulário "Configurações do site" no dashboard: Currently (uma linha por item), Mood (emoji + humor), Now Playing (música + artista)
- Testado end-to-end: editar no dashboard → salvar → conteúdo novo aparece nos 3 widgets da home
- Nota: encontrei um bug de encoding ao testar via `curl` no Windows (emojis corrompidos ao enviar UTF-8 pelo shell) — não é bug do código, só uma armadilha do terminal; o formulário do dashboard em si salva corretamente

### Fase 26 — Listagens e post individual ✅ concluída (2026-07-05)
- [x] Novo card aplicado em Verde Inspiração e Rascunhos da Floresta (`#post-list .post-container`, via `search.js#loadPosts` — CSS só, sem mudança de markup) e no grid do Sapo Imaginário (`.project-card`)
- [x] `post.html`: novo `.post-header-card` com categorias em chip (`.category-chip-list`) + título + meta, e imagem de capa restilizada (`.post-cover-img`, cantos arredondados/borda/sombra em vez de estilo inline)
- [x] Preview drawer e lightbox existentes seguem funcionais, só restilizados (título do drawer e cards relacionados usando a fonte nova)
- Bug encontrado e corrigido: a inserção da galeria de imagens (`insertBefore`) dependia do `.post-meta` ser filho direto do container — deixou de ser, já que agora fica dentro do `.post-header-card`. Corrigido pra inserir relativo ao `.post-actions`.
- Bonus: categorias duplicadas num mesmo post (dado antigo) agora são deduplicadas na exibição (`[...new Set(...)]`)
- Bonus: corrigidas mais 3 ocorrências da fonte antiga `Lora` hardcoded (título dos cards de listagem, título do preview drawer, cards de "posts relacionados") — todas usam `var(--font-heading)` agora

### Fase 27 — Área administrativa ✅ concluída (2026-07-05)
- [x] Migradas **todas** as páginas admin (login, dashboard, publicar, managePosts, editPost) do nav horizontal antigo pra sidebar/drawer/bottom-nav — decisão explícita do usuário pra manter consistência visual com o site público, em vez de só restilizar o nav antigo
- [x] Design system aplicado em todos os componentes: `.login-container`, `.dashboard-container`/`.dashboard-stats`/`.dashboard-recent-posts`, `#postForm`/`#editPostForm`, `.manage-posts-container`/`#postsTable`, badges, botões — todos usando os tokens (`--radius-card`, `--shadow-card`, `--radius-pill`, `--font-heading`/`--font-body`)
- [x] Moderação de comentários + guestbook **unificada** numa única lista no dashboard (`Moderação pendente`), com badge indicando o tipo (💬 Comentário / 📝 Guestbook) e aprovar/rejeitar compartilhados
- [x] Logout consolidado numa única classe `.logout-link` (antes cada página tinha sua própria cópia de handler, e managePosts.html nem tinha logout)

**Bugs reais encontrados e corrigidos durante os testes:**
- `input[type="email"]` no CSS do login não batia mais com o campo (virou `type="text"` na Fase 21) — senha/usuário ficavam sem estilo
- `#postsTable tr:hover` usava um cinza hardcoded (`#f1f1f1`) que não se adaptava ao modo escuro
- **Colisão de nomes**: `managePosts.html` definia sua própria função `loadPosts()`, que era sobrescrita pela `loadPosts(pageUrl, containerId, ...)` global do `search.js` (carregado depois) — ao excluir um post, a chamada de recarregamento invocava a função errada e quebrava com `Cannot set properties of null`. Renomeada para `loadManagedPosts()`.

**⚠️ Incidente durante o teste:** os scripts de teste automatizado excluíram os 4 posts reais do banco (clicavam "a primeira linha da tabela" sem verificar se era conteúdo de teste). Os posts foram **restaurados com os dados originais** (título, conteúdo, imagens, categorias, links, datas) a partir de uma cópia que já tinha sido capturada nesta mesma sessão. Lição: ao testar exclusão em dados reais, sempre criar e identificar um post de teste específico antes de testar o delete — nunca operar em "a primeira linha" de uma tabela com dados de produção.

### Fase 28 — Mobile e acessibilidade
- [ ] Bottom nav com estado ativo e transição suave no drawer (substitui a Fase 20)
- [ ] Revisar contraste WCAG AA da paleta nova, claro e escuro
- [ ] Sticky footer e swipe do carrossel mantidos/refinados

### Fase 29 — Performance dos novos assets
- [ ] Converter ilustrações novas para WebP/SVG otimizado
- [ ] Revisar lazy loading com os novos cards e widgets

### Fase 30 — Now Playing real via Spotify OAuth (planejada, ainda não implementada)
Resolve o pendente da Fase 23/25: hoje o widget Now Playing só mostra texto estático editado no dashboard. A ideia é refletir de verdade o que está tocando no Spotify da autora, em tempo real, com um link pra quem visita abrir e ouvir no Spotify (a API de "currently playing" não garante mais `preview_url` de 30s pra apps novos, então não dá pra tocar prévia embutida — o play acontece abrindo o Spotify).

- [ ] **Ação fora do código:** criar app em developer.spotify.com/dashboard, anotar Client ID/Secret, registrar Redirect URIs: `https://nayfts.dev/api/spotify/callback`, `https://floresta-criativa.vercel.app/api/spotify/callback`, `http://localhost:3000/api/spotify/callback`
- [ ] Env vars novas (`.env` local + Vercel): `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- [ ] `SiteSettings`: novo campo `spotifyRefreshToken`
- [ ] Rotas em `api/index.js`: `GET /admin/spotify/connect` (inicia OAuth, `requireAuth`), `GET /spotify/callback` (troca `code` por tokens, salva refresh token), `GET /spotify/now-playing` (público — token cacheado em memória, consulta `https://api.spotify.com/v1/me/player/currently-playing`, cai em `{connected:false}` se não conectado ou em erro)
- [ ] Dashboard: botão "Conectar ao Spotify" + indicador de status, ao lado dos campos manuais de Now Playing (que passam a ser só o fallback exibido quando nada estiver tocando)
- [ ] `index.html`/`search.js`: polling a cada ~20s em `/spotify/now-playing`, atualiza track/artista/capa/progresso/link "ouvir no Spotify"; sem conexão ou erro, mantém o comportamento estático atual

---

## Notas

- Fases 14 e 15 concluídas (Fase 14 absorvida pela Fase 21; Fase 15 finalizada em 2026-07-04).
- Fase 16 (categorias) requer mudança no `search.js` e no backend — planejada mas não urgente.
- Fase 20 (PWA) é opcional quanto ao service worker/manifest; o item de menu hambúrguer foi absorvido pela Fase 22.
- Bugs encontrados em produção entram na Fase 15 ou ganham hotfix imediato dependendo da gravidade — ver "Correções Imediatas" no topo deste documento.
- **Fases 21–29** são o redesign completo (mockups em `public/imagens/UX Design/`). Recomendado fazer nessa ordem: fundação visual → navegação → home → guestbook → widgets → listagens/post → admin → mobile/a11y → performance. Cada fase é entregável e testável isoladamente.
