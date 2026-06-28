# Floresta Criativa

Blog e portfólio pessoal da Nay — espaço para escritas, projetos, hobbies e inspirações.

**Live:** https://floresta-criativa.vercel.app

---

## Sobre o Projeto

A Floresta Criativa é um site com backend próprio que funciona como blog e vitrine pessoal. O conteúdo é organizado em três seções temáticas, mais ferramentas de suporte:

| Página | Descrição |
|--------|-----------|
| **Home** | Carrossel de posts recentes + seção "Sobre Mim" integrada |
| **Verde Inspiração** | Hobbies, animes, jogos e leituras |
| **Sapo Imaginário** | Portfólio e projetos (grid com preview drawer) |
| **Rascunhos da Floresta** | Escritas, crônicas e textos pessoais |
| **Roleta** | Ferramenta de sorteio em `/roleta.html` |

---

## Stack

**Backend**
- Node.js + Express 4 (serverless via `@vercel/node`)
- MongoDB Atlas via Mongoose
- Sessões com `express-session` + `connect-mongo`
- Upload de imagens via Cloudinary (SDK oficial)
- Validação com `express-validator`
- Hash de senhas com `bcryptjs`
- Rate limiting com `express-rate-limit`

**Frontend**
- HTML5, CSS3, JavaScript vanilla
- CKEditor 5 para edição de posts
- CSS custom properties + modo escuro (`data-theme="dark"`)
- Busca, tema e nav injetados globalmente via `search.js`

**Deploy**
- Vercel (`@vercel/node` + `@vercel/static`)

---

## Estrutura do Projeto

```
Floresta Criativa/
├── api/
│   └── index.js                  # Express + todas as rotas
├── public/
│   ├── index.html                # Home: carrossel + sobre mim
│   ├── verde-inspiracao.html
│   ├── sapo-imaginario.html      # Portfólio com grid e preview drawer
│   ├── rascunhos-da-floresta.html
│   ├── post.html                 # Post individual
│   ├── roleta.html               # Mini-app de sorteio
│   ├── login.html
│   ├── register.html             # Desativado (rota retorna 403)
│   ├── reset-password.html
│   ├── dashboard.html            # Painel da autora
│   ├── publicar.html             # Criar novo post
│   ├── managePosts.html          # Gerenciar posts
│   ├── editPost.html             # Editar post existente
│   ├── search.js                 # Busca, tema, nav, paginação
│   ├── styles.css
│   └── imagens/
│       ├── uploads/              # Imagens legadas (locais)
│       └── favicon_io/
├── create-user.js                # Script local para criar usuário
├── reset-password.js             # Script local para resetar senha
├── .env                          # Variáveis de ambiente (não commitar)
├── vercel.json
└── package.json
```

---

## Rotas da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/login` | — | Autenticar (rate limit: 5/15min) |
| GET | `/logout` | Sim | Encerrar sessão |
| POST | `/reset-password` | — | Redefinir senha via `RESET_SECRET` (rate limit: 3/h) |
| GET | `/user-info` | Sim | Dados da usuária logada |
| GET | `/posts?url=X&page=N&limit=N` | — | Posts por página (exclui rascunhos) |
| GET | `/post/:id` | — | Post individual (aceita slug ou ObjectId) |
| GET | `/recent-posts` | — | 5 posts mais recentes |
| GET | `/search?q=X&category=X&startDate=X&endDate=X` | — | Busca (exclui rascunhos) |
| POST | `/addPost` | Sim | Criar post (imagem → Cloudinary) |
| POST | `/editPost/:id` | Sim | Editar post |
| DELETE | `/posts/:id` | Sim | Excluir post |
| PATCH | `/posts/:id/publish` | Sim | Publicar rascunho |
| GET | `/user-posts` | Sim | Posts da autora |
| GET | `/dashboard-stats` | Sim | Estatísticas do dashboard |
| GET | `/feed.xml` | — | Feed RSS (20 posts mais recentes) |
| POST | `/comments` | — | Enviar comentário (rate limit: 5/h) |
| GET | `/comments/:postId` | — | Comentários aprovados de um post |
| GET | `/admin/comments/pending` | Sim | Comentários aguardando moderação |
| PATCH | `/admin/comments/:id/approve` | Sim | Aprovar comentário |
| DELETE | `/admin/comments/:id` | Sim | Excluir comentário |

> **Nota:** `POST /register` está desativado (retorna 403). Cadastro feito via `node create-user.js`.

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
  content: String,         // HTML do CKEditor
  url: String,             // página de destino ("verde-inspiracao.html", etc.)
  image_path: String,      // URL Cloudinary ou caminho local legado
  gallery: [String],       // URLs Cloudinary para galeria de imagens
  slug: String,            // gerado do título
  publish_date: Date,
  categories: [String],    // "Escrita" | "Projetos" | "Animes" | "Jogos" | "Slice of Life"
  author: ObjectId,
  status: String,          // "published" | "draft"
  views: Number,
  technologies: [String],  // para posts do Sapo Imaginário
  external_link: String,   // link externo do projeto
  preview_link: String,    // URL para iframe de preview
}
```

**Comment**
```js
{
  post: ObjectId,
  author: String,
  content: String,
  createdAt: Date,
  approved: Boolean,       // false por padrão — requer moderação
}
```

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Conta no MongoDB Atlas
- Conta no Cloudinary

### 1. Clone o repositório
```bash
git clone https://github.com/NayFTS/FlorestaCriativa.git
cd FlorestaCriativa
```

### 2. Configure as variáveis de ambiente
Crie `.env` na raiz:
```env
SESSION_SECRET=seu_segredo_aqui
MONGO_ATLAS=mongodb+srv://usuario:senha@cluster.mongodb.net/dbname
RESET_SECRET=chave_para_reset_de_senha
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

### 3. Crie o usuário inicial
```bash
node create-user.js
```

### 4. Instale e inicie
```bash
npm install
npm start   # executa "vercel dev"
```

Acesse `http://localhost:3000`.

---

## Variáveis de Ambiente no Vercel

Configure em **Settings → Environment Variables**:

| Variável | Descrição |
|----------|-----------|
| `SESSION_SECRET` | Segredo da sessão |
| `MONGO_ATLAS` | URI do MongoDB Atlas |
| `RESET_SECRET` | Chave para reset de senha |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | API key do Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret do Cloudinary |

---

## Licença

Projeto pessoal. Todos os direitos reservados © 2024–2026 Nay.
