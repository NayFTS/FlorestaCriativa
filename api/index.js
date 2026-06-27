require('dotenv').config();

const express = require('express'); 
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Conexão ao MongoDB (Escolha entre local e online)
const mongoLocal = 'mongodb://127.0.0.1:27017/floresta_criativa';
const mongoAtlas = process.env.MONGO_ATLAS; // 🔹 A URL do Atlas virá do .env

const mongoURI = mongoAtlas || mongoLocal; // 🔹 Por padrão, usa o Atlas se disponível

mongoose.connect(mongoURI)
    .then(() => console.log(`Conectado ao MongoDB: ${mongoURI.includes('localhost') ? 'Local' : 'Atlas'}`))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração de sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoURI,
        collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Definir modelos do MongoDB
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
}));

const Post = mongoose.model('Post', new mongoose.Schema({
    title: String,
    content: String,
    url: String,
    image_path: String,
    publish_date: { type: Date, default: Date.now },
    categories: [String],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    slug: { type: String, sparse: true },
    views: { type: Number, default: 0 },
    status: { type: String, enum: ['published', 'draft'], default: 'published' }
}));

function slugify(text) {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-')
        .substring(0, 100) || 'post';
}

async function uniqueSlug(title) {
    const base = slugify(title);
    let slug = base, i = 1;
    while (await Post.findOne({ slug })) slug = `${base}-${i++}`;
    return slug;
}


const uploadDir = path.join(__dirname, '../public/imagens/uploads');

// Verifica se o diretório existe, e cria se não existir
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configura o multer para salvar as imagens no diretório de upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limite de 2MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif|webp/;
        const mimeType = fileTypes.test(file.mimetype);
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Apenas arquivos de imagem são permitidos (JPEG, PNG, GIF).'));
    }
});

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    next();
}

// Rota de registro
const { body, validationResult } = require('express-validator');

app.post('/register', [
    body('username').trim().isLength({ min: 3 }).withMessage('Nome de usuário deve ter pelo menos 3 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, email, password } = req.body;
        if (await User.findOne({ email })) return res.status(400).send('Email já registrado');
        const hashedPassword = bcrypt.hashSync(password, 10);
        await new User({ username, email, password: hashedPassword }).save();
        res.status(200).send('Usuário registrado com sucesso');
    } catch (err) {
        console.error('Erro no registro:', err);
        res.status(500).send('Erro no servidor');
    }
});


// Rota de login
app.post('/login', [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error('Erro ao regenerar sessão:', err);
                return res.status(500).json({ message: 'Erro no servidor' });
            }
            req.session.userId = user._id;
            req.session.username = user.username;
            res.status(200).json({ message: 'Login bem-sucedido' });
        });

    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});




// Rota de reset de senha (protegida por chave secreta)
app.post('/reset-password', [
    body('email').isEmail().withMessage('Email inválido'),
    body('secret').notEmpty().withMessage('Chave secreta obrigatória'),
    body('newPassword').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, secret, newPassword } = req.body;

    if (secret !== process.env.RESET_SECRET) {
        return res.status(403).json({ message: 'Chave secreta inválida' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

        user.password = bcrypt.hashSync(newPassword, 10);
        await user.save();
        res.status(200).json({ message: 'Senha atualizada com sucesso' });
    } catch (err) {
        console.error('Erro no reset de senha:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para buscar informações do usuário
app.get('/user-info', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.json({ username: user.username });
    } catch (err) {
        res.status(500).send('Erro ao buscar usuário');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao encerrar sessão:', err);
            return res.status(500).send('Erro ao fazer logout');
        }
        res.clearCookie('connect.sid'); // Remove o cookie da sessão
        res.status(200).send('Logout bem-sucedido');
    });
});


app.post('/addPost', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, content, url, status } = req.body;
        let categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        const image_path = req.file ? req.file.filename : null;
        const slug = await uniqueSlug(title);

        const newPost = new Post({
            title, content, url, image_path, categories,
            author: req.session.userId,
            slug,
            status: status === 'draft' ? 'draft' : 'published'
        });

        await newPost.save();
        res.json({ success: true, message: 'Post publicado com sucesso!', slug: newPost.slug });
    } catch (err) {
        console.error('Erro ao salvar o post:', err);
        res.status(400).json({ success: false, message: err.message || 'Erro ao salvar o post' });
    }
});

// Rota de edição (exemplo semelhante)
app.post('/editPost/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const postId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: 'ID de post inválido' });
        }

        const { title, content, url } = req.body;
        const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado' });
        }

        if (post.author.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para editar este post' });
        }

        // Atualiza os campos
        post.title = title;
        post.content = content;
        post.url = url;
        post.categories = categories;

        // Substitui a imagem, se uma nova for enviada
        if (req.file) {
            post.image_path = req.file.filename;
        }

        await post.save();
        res.json({ success: true, message: 'Post atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar post:', err);
        res.status(400).json({ success: false, message: err.message || 'Erro ao atualizar post' });
    }
});




// Rota para buscar posts
app.get('/posts', async (req, res) => {
    const { url, page, limit } = req.query;
    try {
        const query = { status: { $ne: 'draft' } };
        if (url) query.url = url;
        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, parseInt(limit) || 5);
            const skip = (pageNum - 1) * limitNum;
            const [posts, total] = await Promise.all([
                Post.find(query).sort({ publish_date: -1 }).skip(skip).limit(limitNum),
                Post.countDocuments(query)
            ]);
            return res.json({ posts, total });
        }
        const posts = await Post.find(query).sort({ publish_date: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar posts:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/post/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let post;
        if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
            post = await Post.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
        } else {
            post = await Post.findOneAndUpdate({ slug: id }, { $inc: { views: 1 } }, { new: true });
        }
        if (!post) return res.status(404).json({ success: false, message: 'Post não encontrado' });
        res.json(post);
    } catch (err) {
        console.error('Erro ao buscar post:', err);
        res.status(500).json({ success: false, message: 'Erro ao buscar post' });
    }
});



// Rota para deletar posts
app.delete('/posts/:id', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).send('Post não encontrado');
        if (post.author.toString() !== req.session.userId.toString()) {
            return res.status(403).send('Sem permissão para excluir este post');
        }
        await Post.findByIdAndDelete(req.params.id);
        res.status(200).send('Postagem excluída com sucesso');
    } catch (err) {
        res.status(500).send('Erro no servidor');
    }
});

// Rota para buscar posts recentes
app.get('/recent-posts', async (req, res) => {
    try {
        const posts = await Post.find({ status: { $ne: 'draft' } }).sort({ publish_date: -1 }).limit(5);
        res.json(posts);
    } catch (err) {
        res.status(500).send('Erro ao buscar posts');
    }
});

app.get('/search', async (req, res) => {
    try {
        const { q, category, startDate, endDate } = req.query;

        // Cria o filtro de busca
        const filter = {};
        if (q) {
            filter.$or = [
                { title: { $regex: q, $options: 'i' } }, // Busca por título
                { content: { $regex: q, $options: 'i' } } // Busca por conteúdo
            ];
        }
        if (category) {
            const categories = category.split(','); // Converte para array
            filter.categories = { $in: categories }; // Filtra pelas categorias
        }
        if (startDate || endDate) {
            filter.publish_date = {};
            if (startDate) filter.publish_date.$gte = new Date(startDate); // Data inicial
            if (endDate) filter.publish_date.$lte = new Date(endDate); // Data final
        }

        // Busca no banco de dados
        const posts = await Post.find(filter);
        res.json(posts);
    } catch (err) {
        console.error('Erro na pesquisa:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/user-posts', requireAuth, async (req, res) => {
    try {
        const posts = await Post.find({ author: req.session.userId }).sort({ publish_date: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar postagens do usuário:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const authorId = req.session.userId;
        const [allPosts, recentPosts] = await Promise.all([
            Post.find({ author: authorId }),
            Post.find({ author: authorId }).sort({ publish_date: -1 }).limit(3)
        ]);
        const totalPosts = allPosts.length;
        const draftCount = allPosts.filter(p => p.status === 'draft').length;
        const totalViews = allPosts.reduce((sum, p) => sum + (p.views || 0), 0);
        const mostViewedPost = allPosts.sort((a, b) => (b.views || 0) - (a.views || 0))[0];

        res.json({
            totalPosts,
            draftCount,
            publishedCount: totalPosts - draftCount,
            totalViews,
            mostPopularPost: mostViewedPost ? mostViewedPost.title : 'Nenhuma postagem encontrada',
            recentPosts,
        });
    } catch (err) {
        console.error('Erro ao buscar estatísticas do dashboard:', err);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
});



// Publicar rascunho
app.patch('/posts/:id/publish', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post não encontrado' });
        if (post.author.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ message: 'Sem permissão' });
        }
        post.status = 'published';
        await post.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Feed RSS
app.get('/feed.xml', async (req, res) => {
    try {
        const posts = await Post.find({ status: { $ne: 'draft' } }).sort({ publish_date: -1 }).limit(20);
        const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const stripHtml = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

        const items = posts.map(post => {
            const desc = stripHtml(post.content).substring(0, 200);
            const link = `${siteUrl}/post.html?id=${post._id}`;
            return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <description><![CDATA[${desc}...]]></description>
      <pubDate>${new Date(post.publish_date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
        }).join('');

        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Floresta Criativa</title>
    <link>${siteUrl}</link>
    <description>Blog pessoal — escrita, projetos e inspiração</description>
    <language>pt-br</language>
    <atom:link href="${siteUrl}/api/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`);
    } catch (err) {
        console.error('Erro ao gerar feed RSS:', err);
        res.status(500).send('Erro ao gerar feed');
    }
});

// Servir arquivos estáticos
app.use(express.static('public'));

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
