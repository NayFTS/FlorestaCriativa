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

---

## Próximas Fases

### Fase 14 — Tipografia
- [ ] Importar Google Fonts: `Lora` para títulos e `Inter` para corpo de texto
- [ ] Ajustar tamanhos e line-height no CSS para leitura mais agradável
- [ ] Aplicar em todo o site (incluindo cards de post e overlay de busca)

---

### Fase 15 — UX Pendente
- [ ] **Paginação no managePosts** — hoje carrega todos os posts de uma vez; adicionar paginação de 20 em 20
- [ ] **Modal de confirmação no delete** — substituir o `confirm()` nativo por modal customizado com o design do site
- [ ] **Feedback visual no login** — destacar campos com borda e ícone de erro quando a autenticação falhar
- [ ] **Carrossel sem posts** — quando não há posts publicados, exibir um card de placeholder amigável

---

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
- [ ] Menu hambúrguer com animação de transição suave
- [ ] Swipe no carrossel da home (já tem toque, mas refinar a sensibilidade)
- [ ] `manifest.json` e ícones para adicionar à tela inicial
- [ ] Service worker para cache básico offline

---

## Notas

- Fases 14 e 15 são as mais prioritárias — impacto imediato na experiência.
- Fase 16 (categorias) requer mudança no `search.js` e no backend — planejada mas não urgente.
- Fase 20 (PWA) é opcional; só faz sentido se o uso mobile justificar o esforço.
- Bugs encontrados em produção entram na Fase 15 ou ganham hotfix imediato dependendo da gravidade.
