# Floresta Criativa

Blog e portfólio pessoal da Nay — um espaço para compartilhar escritas, projetos, hobbies e inspirações.

**Live:** https://floresta-criativa.vercel.app

---

## Sobre o Projeto

A Floresta Criativa é um site com backend próprio que funciona como blog e vitrine pessoal. O conteúdo é organizado em quatro seções temáticas, mais uma ferramenta extra:

| Página | Descrição |
|--------|-----------|
| **Sobre Mim** | Apresentação pessoal |
| **Verde Inspiração** | Hobbies, animes, jogos e leituras |
| **Sapo Imaginário** | Portfólio e projetos |
| **Rascunhos da Floresta** | Escritas e ideias pessoais |
| **Roleta** | Ferramenta de sorteio (mini-app em `/roleta.html`) |

---

## Stack

**Backend**
- Node.js + Express 4
- MongoDB Atlas (cloud) via Mongoose
- Autenticação com sessões (`express-session` + `connect-mongo`)
- Upload de imagens via **Cloudinary** (SDK oficial)
- Validação com `express-validator`
- Hash de senhas com `bcryptjs`

**Frontend**
- HTML5, CSS3, JavaScript vanilla
- CKEditor 5 (editor rico para posts)
- CSS com variáveis (`--color-bg`, `--color-text`, etc.) + modo escuro

**Deploy**
- Vercel (`@vercel/node` para o backend, `@vercel/static` para o frontend)

---

## Estrutura do Projeto

```
Floresta Criativa/
├── api/
│   └── index.js                  # Servidor Express + todas as rotas
├── public/
│   ├── index.html                # Home com carrossel de posts recentes
│   ├── about.html                # Sobre Mim
│   ├── verde-inspiracao.html     # Verde Inspiração
│   ├── sapo-imaginario.html      # Sapo Imaginário (portfólio)
│   ├── rascunhos-da-floresta.html
│   ├── post.html                 # Visualização de post individual
│   ├── roleta.html               # Mini-app de sorteio
│   ├── login.html
│   ├── reset-password.html       # Reset de senha via chave secreta
│   ├── dashboard.html            # Painel da autora
│   ├── publicar.html             # Criar novo post
│   ├── managePosts.html          # Gerenciar e excluir posts
│   ├── editPost.html             # Editar post existente
│   ├── search.js                 # Busca, paginação, toggle de tema
│   ├── styles.css
│   └── imagens/
│       ├── uploads/              # (legado) imagens locais de posts antigos
│       └── favicon_io/
├── .env                          # Variáveis de ambiente (não commitar)
├── vercel.json
├── package.json
└── ROADMAP.md
```

---

## Rotas da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/login` | — | Autenticar e criar sessão |
| GET | `/logout` | Sim | Encerrar sessão |
| POST | `/reset-password` | — | Redefinir senha via `RESET_SECRET` |
| GET | `/user-info` | Sim | Dados da usuária logada |
| GET | `/posts?url=X&page=N&limit=N` | — | Posts filtrados por página |
| GET | `/post/:id` | — | Post individual (aceita slug ou ObjectId) |
| GET | `/recent-posts` | — | 5 posts mais recentes |
| GET | `/search` | — | Busca por texto, categorias e datas |
| POST | `/addPost` | Sim | Criar post (imagem enviada ao Cloudinary) |
| POST | `/editPost/:id` | Sim | Editar post |
| DELETE | `/posts/:id` | Sim | Excluir post |
| PATCH | `/posts/:id/publish` | Sim | Publicar rascunho |
| GET | `/user-posts` | Sim | Posts da usuária logada |
| GET | `/dashboard-stats` | Sim | Estatísticas do dashboard |
| GET | `/feed.xml` | — | Feed RSS com os 20 posts mais recentes |

> **Nota:** A rota `POST /register` está desativada (retorna 403). O cadastro é feito localmente via `node create-user.js`.

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
  image_path: String,        // URL do Cloudinary ou caminho local legado
  slug: String,              // gerado automaticamente do título
  publish_date: Date,
  categories: [String],      // "Escrita" | "Projetos" | "Animes" | "Jogos" | "Slice of Life"
  author: ObjectId,          // ref: User
  status: String,            // "published" | "draft"
  views: Number
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
Crie um arquivo `.env` na raiz:
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

### 4. Instale as dependências e inicie
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
| `RESET_SECRET` | Chave para resetar senha via `/reset-password.html` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | API key do Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret do Cloudinary |

---

## Licença

Projeto pessoal. Todos os direitos reservados © 2024–2026 Nay.
