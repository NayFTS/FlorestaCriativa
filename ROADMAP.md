# Roadmap — Floresta Criativa

Organizado por prioridade. Correções antes de novas funcionalidades.

---

## Fase 1 — Correções Críticas ✅

- [x] Verificação de autoria no DELETE e POST `/editPost/:id`
- [x] `.env` removido do histórico git e adicionado ao `.gitignore`
- [x] Apagar arquivos legados com credenciais (`index_backup.js`, scripts provisórios)
- [x] Apagar pasta `FlorestaCriativa/` duplicada na raiz

---

## Fase 2 — Bugs Visuais e de UX ✅

- [x] Carrossel: centralizar posts quando há menos de 3
- [x] Remover linha de borda abaixo do nav
- [x] Alinhar título e conteúdo dentro de `post.html`
- [x] Adicionar separador visual entre posts
- [x] Botão de limpar busca em todas as páginas com busca

---

## Fase 3 — Qualidade de Código ✅

- [x] Eliminar código de busca duplicado → extraído para `search.js`
- [x] Remover Tailwind CSS (não estava sendo usado)
- [x] Centralizar verificação de autenticação com `requireAuth`

---

## Fase 4 — Melhorias de UX ✅

- [x] Toolbar completo no CKEditor
- [x] Preview de imagem antes do upload
- [x] Paginação com "Carregar mais" nas seções
- [x] Feedback de loading e erro amigável
- [x] Melhorar mobile: header e nav

---

## Fase 5 — Novas Funcionalidades ✅

- [x] Sistema de rascunhos
- [x] Slug amigável na URL
- [x] Contagem de visualizações
- [x] Meta tags OG para SEO
- [x] Feed RSS
- [x] Modo escuro com tema florestal noturno

---

## Fase 6 — Infraestrutura e Segurança

- [x] **Migrar uploads para Cloudinary** — imagens não somem mais a cada redeploy
- [x] **Remover registro público** — `POST /register` retorna 403; cadastro via `create-user.js` local
- [x] **Corrigir roteamento da API no Vercel** — middleware que remove prefixo `/api` antes do Express rotear; `module.exports = app` adicionado
- [ ] **Rate limiting nas rotas de auth** — `express-rate-limit` com janela de 15 min / 10 tentativas por IP nas rotas `/login`, `/reset-password`

---

## Fase 7 — Correções de UX Pendentes

- [ ] **Feedback visual no login** — destacar campos com borda vermelha quando login falhar
- [ ] **Paginação no managePosts** — carregar posts em lotes, não todos de uma vez
- [ ] **Modal de confirmação antes de excluir** — substituir `confirm()` nativo por modal customizado
- [ ] **Carrossel responsivo** — ajustar comportamento em telas muito pequenas (≤360px)

---

## Fase 8 — Design Refresh

A identidade visual atual funciona mas parece genérica. Objetivo: tornar o site mais pessoal, editorial e coeso.

- [ ] **Tipografia** — trocar Arial por fontes do Google Fonts (sugestão: `Lora` para títulos, `Inter` para texto)
- [ ] **Cards de post redesenhados** — imagem em destaque, data e categoria visíveis, sombra sutil no hover
- [ ] **Header reimaginado** — fundo com textura ou gradiente, título e subtítulo com mais presença
- [ ] **Nav mais limpo** — remover a barra de busca do nav; busca abre como overlay ao clicar em ícone
- [ ] **Footer com conteúdo** — links de redes sociais, RSS, e frase pessoal
- [ ] **Página de post mais editorial** — largura máxima de leitura (65ch), tipografia maior, pull quotes estilizados

---

## Fase 9 — Novas Funcionalidades

Features que expandem o que o site faz.

- [ ] **Página "Sobre Mim" estática** — conteúdo fixo com apresentação, foto, redes sociais e habilidades (hoje a página só carrega posts com url='about.html')
- [ ] **Tempo estimado de leitura** — calcular e exibir "~N min de leitura" no topo de cada post e nos cards
- [ ] **Posts relacionados** — ao final de cada post, exibir 2–3 posts da mesma categoria
- [ ] **Botão de compartilhar** — copiar link e compartilhar no post individual
- [ ] **Integrar a Roleta ao site** — adicionar link no nav, aplicar o design do site (`styles.css`), salvar itens por URL (não só localStorage)
- [ ] **Pesquisa global** — disponibilizar a busca também na home (hoje só funciona nas páginas de seção)

---

## Fase 10 — Portfólio (Sapo Imaginário)

O Sapo Imaginário é a seção de projetos, mas hoje exibe posts como lista genérica. Merece um layout próprio.

- [ ] **Layout de cards de projeto** — grade visual com imagem, título, tecnologias usadas e link
- [ ] **Campo "link externo" no post** — para projetos que vivem em outro lugar (GitHub, itch.io, etc.)
- [ ] **Filtro por tecnologia/tipo** — filtrar projetos por tag (web, jogo, arte, etc.)

---

## Notas

- Bugs novos encontrados em produção entram na Fase 6 ou 7 dependendo da gravidade.
- Fase 8 (design) pode ser feita em paralelo com qualquer outra fase — é independente.
- A Fase 10 depende de mudanças no modelo de dados do Post (campo `external_link`).
