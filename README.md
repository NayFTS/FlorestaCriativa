# Floresta Criativa

Blog e portfolio pessoal da Nay — um espaço para compartilhar escritas, projetos, hobbies e inspirações.

**Live:** https://floresta-criativa.vercel.app

---

## Sobre o Projeto

A Floresta Criativa é um site com backend próprio que funciona como blog e vitrine pessoal. O conteúdo é organizado em quatro seções temáticas:

| Seção | Descrição |
|-------|-----------|
| **Sobre Mim** | Apresentação pessoal |
| **Verde Inspiração** | Hobbies, animes, jogos e leituras |
| **Sapo Imaginário** | Portfolio e projetos |
| **Rascunhos da Floresta** | Escritas e ideias pessoais |

---

## Stack

**Backend**
- Node.js + Express 4
- MongoDB Atlas (cloud) via Mongoose
- Autenticação com sessões (`express-session` + `connect-mongo`)
- Upload de imagens com Multer (máx. 2MB, JPEG/PNG/GIF/WebP)
- Validação com `express-validator`
- Hash de senhas com `bcryptjs`

**Frontend**
- HTML5, CSS3, JavaScript vanilla
- CKEditor 5 (editor de texto rico para posts)
- Tailwind CSS (instalado, uso parcial)

**Deploy**
- Vercel (`@vercel/node` para o backend, `@vercel/static` para o frontend)

---

## Estrutura do Projeto

```
Floresta Criativa/
├── api/
│   └── index.js              # Servidor Express + todas as rotas
├── models/
│   ├── User.js               # Schema de usuários (username, email, senha)
│   └── Post.js               # Schema de posts (título, conteúdo, imagem, url, categorias, autor)
├── public/
│   ├── index.html            # Home com carrossel de posts recentes
│   ├── about.html            # Sobre Mim
│   ├── verde-inspiracao.html # Verde Inspiração
│   ├── sapo-imaginario.html  # Sapo Imaginário (portfolio)
│   ├── rascunhos-da-floresta.html
│   ├── post.html             # Visualização de post individual
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html        # Painel do usuário autenticado
│   ├── publicar.html         # Criar novo post
│   ├── managePosts.html      # Gerenciar e excluir posts
│   ├── editPost.html         # Editar post existente
│   ├── styles.css
│   └── imagens/
│       ├── uploads/          # Imagens enviadas nos posts
│       └── favicon_io/
├── .env                      # Variáveis de ambiente (não commitar)
├── vercel.json               # Configuração de deploy
├── package.json
└── ROADMAP.md
```

---

## Rotas da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/register` | — | Criar conta |
| POST | `/login` | — | Autenticar e criar sessão |
| GET | `/logout` | Sim | Encerrar sessão |
| GET | `/user-info` | Sim | Dados do usuário logado |
| GET | `/posts?url=X` | — | Posts filtrados por página |
| GET | `/post/:id` | — | Post individual |
| GET | `/recent-posts` | — | 5 posts mais recentes |
| GET | `/search` | — | Busca por texto, categorias e datas |
| POST | `/addPost` | Sim | Criar post com imagem |
| POST | `/editPost/:id` | Sim | Editar post |
| DELETE | `/posts/:id` | — | Excluir post |
| GET | `/user-posts` | Sim | Posts do usuário logado |
| GET | `/dashboard-stats` | Sim | Estatísticas do dashboard |

---

## Modelos de Dados

**User**
```js
{ username: String, email: String (único), password: String (bcrypt) }
```

**Post**
```js
{
  title: String,
  content: String,           // HTML gerado pelo CKEditor
  url: String,               // página de destino do post
  image_path: String,        // nome do arquivo em /imagens/uploads/
  publish_date: Date,
  categories: [String],      // "Escrita" | "Projetos" | "Animes" | "Jogos" | "Slice of Life"
  author: ObjectId           // ref: User
}
```

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Conta no MongoDB Atlas (ou instância local)

### 1. Clone o repositório
```bash
git clone https://github.com/NayFTS/FlorestaCriativa.git
cd FlorestaCriativa
```

### 2. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz:
```env
SESSION_SECRET=seu_segredo_aqui
MONGO_ATLAS=mongodb+srv://usuario:senha@cluster.mongodb.net/dbname
```

### 3. Instale as dependências e inicie
```bash
npm install
npm start        # executa "vercel dev"
```

Acesse `http://localhost:3000`.

---

## Problemas Conhecidos

- Posts recentes no carrossel não ficam centralizados quando há poucos posts
- Linha de borda visível abaixo do nav sem propósito
- Título e conteúdo (`<p>`) dentro do post individual sem alinhamento consistente
- Ausência de separador visual entre posts nas páginas de seção
- Código de busca duplicado em múltiplas páginas
- Tailwind CSS instalado mas `content: []` vazio (sem purge configurado)
- DELETE `/posts/:id` sem verificação de autoria
- Pasta `FlorestaCriativa/` duplicada na raiz (cópia redundante)

---

## Licença

Projeto pessoal. Todos os direitos reservados © 2024–2026 Nay.
