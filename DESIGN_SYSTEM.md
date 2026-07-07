# NAYFTS — Design System & Roadmap

## Conceito

Criar um site que pareça um **blog pessoal dos anos 2000**, mas construído com tecnologias e UX modernas.

A sensação deve ser de um lugar aconchegante na floresta, como se o visitante estivesse entrando numa pequena cabana de um sapinho.

O site não será apenas um portfólio, mas um espaço vivo para:

* 📖 Escrita
* 🎨 Arte
* 💻 Programação
* 📂 Projetos
* 📷 Fotografias
* 🎮 Jogos
* 💭 Pensamentos
* ❤️ Qualquer coisa que eu queira compartilhar

A inspiração principal é uma mistura de:

* Blogs pessoais de 2000~2010
* Animal Crossing
* Stardew Valley
* Notion (organização)
* Windows XP
* Windows Vista (pequenos efeitos de vidro)
* Cottagecore
* Frogcore
* Nature Journal

---

# Paleta de cores

## Light Theme

```css
:root{
--bg:#F5F7EA;
--bg-secondary:#EDF3DE;
--surface:#FFFDF6;

--border:#C8D6B5;

--primary:#6CBF5F;
--primary-light:#95D989;
--primary-dark:#478944;

--accent:#6AB8C7;
--river:#7FD4E8;

--text:#24341F;
--text-soft:#53674E;
--text-muted:#7A8A74;

--gold:#D8B969;
}
```

---

## Dark Theme

```css
:root{
--bg:#08110E;
--bg-secondary:#101912;
--surface:#17221A;

--surface-hover:#223125;

--border:#31402F;

--primary:#87C66B;
--primary-light:#A9E58A;
--primary-dark:#5A9145;

--accent:#6FB7A8;
--river:#285D68;

--text:#E6ECD8;
--text-soft:#B6C0AF;
--text-muted:#7F8B7D;

--gold:#C6B06D;

--danger:#C66A6A;
}
```

---

# Identidade Visual

A cor predominante sempre será o **verde**.

As outras cores servem como apoio.

🌿 Verde → elementos interativos

💧 Azul → rios, links, foco

🌼 Dourado → favoritos, estrelas, badges

🌸 Rosa pastel → flores, pequenos detalhes

Evitar cores extremamente saturadas.

Tudo deve parecer desenhado à mão.

---

# Tipografia

## Logo

**Fredoka SemiBold**

Alternativas:

* Baloo 2
* Coiny
* Grandstander

---

## Navegação

**Quicksand Medium**

Alternativas:

* Nunito
* Varela Round

---

## Corpo do Blog

**Patrick Hand**

Alternativas:

* Kalam
* Gochi Hand

O objetivo é parecer um diário escrito à mão.

---

## Código

JetBrains Mono

ou

Fira Code

---

# Layout

Desktop:

```
Sidebar
↓

Header

↓

Widgets

↓

Feed principal

↓

Guestbook

↓

Footer
```

Mobile:

```
Header

↓

Hero

↓

Navegação

↓

Conteúdo

↓

Widgets

↓

Bottom Navigation
```

---

# Componentes

## Cards

Todos seguem o mesmo padrão.

* Fundo claro
* Borda verde
* Sombra extremamente suave
* Muito arredondados
* Algum doodle decorando um canto

---

## Bordas

Cards

```css
border-radius:20px;
```

Cards pequenos

```css
border-radius:16px;
```

Botões

```css
border-radius:999px;
```

---

## Sombras

Light

```css
box-shadow:0 2px 8px rgba(0,0,0,.12);
```

Dark

```css
box-shadow:0 4px 18px rgba(0,0,0,.35);
```

---

## Linhas

Espessura

```css
2px
```

Nunca usar preto.

Cor

```css
#31402F
```

---

## Espaçamento

```css
padding:24px;
gap:20px;
```

Tudo precisa respirar.

Nada deve ficar apertado.

---

# Fundo

Não usar branco puro.

Light

```
#F5F7EA
```

Dark

```
#08110E
```

Adicionar uma textura de papel extremamente discreta.

Também aplicar um pequeno efeito de noise.

Light

```
2%
```

Dark

```
5%
```

---

# Ícones

Baseados em:

* Lucide
* Phosphor
* Heroicons

Mas sempre acompanhados de doodles.

Exemplo:

🏠 Home

↓

🏠 + uma folhinha

---

# Doodles

Os doodles fazem parte da interface.

Exemplos:

🐸 Sapinhos

🍄 Cogumelos

🌿 Folhas

🌸 Flores

💧 Gotas

✨ Estrelas

🌙 Lua

🪴 Vasos

📖 Livros

🦋 Borboletas

🪵 Troncos

🌱 Brotos

☁️ Nuvens

🌧️ Chuva

🌊 Rio

Nenhum deles deve roubar atenção do conteúdo.

São apenas decoração.

---

# Seções do site

## Home

Resumo geral.

---

## Blog

Lista de posts.

Categorias.

Pesquisa.

Tags.

---

## Escrita

Fanfics.

Capítulos.

Contador de palavras.

Status.

---

## Arte

Galeria.

Speedpaint.

Sketchbook.

---

## Portfolio

Projetos completos.

Estudos de caso.

---

## Código

Projetos.

Github.

Experimentos.

---

## Guestbook

Comentários.

Mensagens dos visitantes.

---

## Currently

O que estou fazendo atualmente.

Exemplo

* Escrevendo capítulo novo
* Aprendendo React
* Jogando Monster Hunter

---

## Mood

Humor do dia.

Com uma ilustração diferente.

---

## Garden Log

Pequenas conquistas.

Exemplo

🌱 Escrevi 1000 palavras

🎨 Fiz uma arte

📚 Li um livro

---

## Música

Widget estilo Winamp.

---

# Micro animações

As animações devem ser suaves e discretas.

Nunca exageradas.

### Natureza

🌿 Folhas balançam lentamente.

💧 Rio possui fluxo contínuo.

🌊 Ondinhas aparecem ao redor dos sapos.

✨ Pequenos brilhos aparecem aleatoriamente.

🌧️ Chuva animada quando o clima for chuva.

☁️ Nuvens movem lentamente.

🌙 Céu muda entre dia e noite.

---

### Sapinhos

Piscar os olhos.

Respirar levemente.

Inclinar a cabeça ocasionalmente.

Sorrir.

Bocejar durante a madrugada.

Dormir dependendo do horário.

---

### Interface

Cards sobem cerca de 4px no hover.

Botões fazem bounce suave.

Ícones giram alguns graus.

Scroll extremamente suave.

Troca de tema muda toda a atmosfera.

---

### Header

Folhas acompanham discretamente o mouse.

Pequenas partículas flutuam.

Rio possui movimento.

---

# UX

Misturar nostalgia com funcionalidades modernas.

Exemplos:

Pesquisa instantânea.

Dark Mode.

Responsividade.

Markdown.

Filtros.

Tags.

Comentários.

Animações leves.

Carregamento rápido.

PWA.

---

# Ideia Principal

Ao invés de parecer apenas um site, ele deve dar a sensação de que o visitante abriu o computador de um pequeno sapinho que mora numa cabana na floresta.

Cada página pode parecer uma "janelinha" diferente desse ambiente:

* 📖 **Blog** → um livro aberto.
* 🎨 **Galeria** → um cavalete de pintura.
* 💻 **Projetos** → um notebook de um sapinho.
* 📷 **Fotos** → uma câmera Polaroid.
* 📝 **Guestbook** → um caderno de visitas.
* 🎵 **Música** → um tocador inspirado no Winamp.
* 📦 **Arquivos** → uma caixa de madeira.

O objetivo final é criar um site com muita personalidade, que seja memorável, aconchegante e divertido de explorar, equilibrando o charme dos blogs antigos com a usabilidade e os recursos esperados de uma aplicação moderna.

---

## Mapeamento para tokens CSS do projeto

Este projeto já usa variáveis prefixadas `--color-*` e `--font-*` em `public/styles.css` (ver Fase 21 do `ROADMAP.md`). Este documento é a fonte de verdade para os *valores*; os nomes reais das variáveis no CSS podem diferir ligeiramente para manter compatibilidade com o código existente (ex: `--primary` deste doc → `--color-accent` no CSS, `--accent`/`--river` (azuis) → `--color-link`/`--color-river`).
