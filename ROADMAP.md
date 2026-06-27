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

- [ ] **Sistema de rascunhos** — permitir salvar um post como rascunho (não publicado) e publicar depois.
- [ ] **Slug amigável na URL** — substituir `?id=6abc123` por URLs como `/post/titulo-do-post` para melhor SEO e legibilidade.
- [ ] **Contagem de visualizações** — incrementar um contador a cada vez que um post é acessado; exibir no dashboard e opcionalmente nos cards.
- [ ] **Seção de tags/categorias navegáveis** — página ou modal que lista todos os posts por categoria, clicável na home e nas seções.
- [ ] **Sitemap e meta tags para SEO** — adicionar `<meta>` de Open Graph e Twitter Card em cada post para melhorar compartilhamento em redes sociais.
- [ ] **Feed RSS** — rota `/feed.xml` que lista os posts mais recentes em formato RSS.
- [ ] **Modo escuro** — toggle de tema claro/escuro com preferência salva em `localStorage`.

---

## Notas

- A ordem das fases é uma sugestão. Fases 1 e 2 são as mais urgentes.
- O roadmap deve ser revisado sempre que novas ideias ou problemas surgirem.
- Bugs novos encontrados em produção entram na Fase 1 ou 2 dependendo da gravidade.
