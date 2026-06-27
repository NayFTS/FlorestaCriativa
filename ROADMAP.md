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

- [ ] **Eliminar código de busca duplicado** — o bloco de busca/filtros avançados está copiado em 4+ páginas. Extrair para um arquivo `search.js` e incluir via `<script src>`.
- [ ] **Configurar Tailwind CSS corretamente** — preencher `content: []` no `tailwind.config.js` com os caminhos dos arquivos HTML e JS, ou remover o Tailwind se não for usar.
- [ ] **Mover imagens de CSS para HTML** — substituir `background-image` em CSS por `<img>` nos lugares onde são conteúdo (não decoração).
- [ ] **Centralizar verificação de autenticação** — criar um middleware `requireAuth` no backend e um helper JS no frontend para verificar sessão, em vez de repetir a lógica em cada página.

---

## Fase 4 — Melhorias de UX e Design

Funcionalidades que melhoram a experiência de quem visita ou publica.

- [ ] **Editor CKEditor: configurar toolbar completo** — habilitar parágrafo, negrito, itálico, listas, títulos, links e talvez código no CKEditor de `publicar.html` e `editPost.html`.
- [ ] **Preview de imagem antes do upload** — em `publicar.html` e `editPost.html`, mostrar preview da imagem selecionada antes de salvar.
- [ ] **Paginação nas seções** — nas páginas de seção com muitos posts, adicionar paginação ou "carregar mais" em vez de listar tudo de uma vez.
- [ ] **Feedback de loading** — adicionar indicador de carregamento (spinner ou skeleton) enquanto posts são buscados via Fetch API.
- [ ] **Tratamento de erro amigável** — quando uma busca não retorna resultados ou um post não é encontrado, exibir mensagem visual clara em vez de tela vazia.
- [ ] **Melhorar mobile: header e nav** — revisar espaçamentos e tamanho de fonte no menu hambúrguer em telas pequenas.

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
