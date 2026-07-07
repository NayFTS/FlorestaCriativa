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
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'floresta-criativa' },
            (error, result) => error ? reject(error) : resolve(result.secure_url)
        );
        stream.end(buffer);
    });
}

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

// Vercel passa o caminho completo (/api/login) ao Express; strip do prefixo antes do roteamento
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) req.url = req.url.slice(4) || '/';
    next();
});

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
const Post = mongoose.model('Post', new mongoose.Schema({
    title: String,
    content: String,
    url: String,
    image_path: String,
    publish_date: { type: Date, default: Date.now },
    categories: [String],
    slug: { type: String, sparse: true },
    views: { type: Number, default: 0 },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    external_link: { type: String, default: '' },
    preview_link: { type: String, default: '' },
    technologies: [String],
    gallery: { type: [String], default: [] }
}));

const Comment = mongoose.model('Comment', new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: String, required: true, maxlength: 60 },
    content: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false }
}));

const GuestbookEntry = mongoose.model('GuestbookEntry', new mongoose.Schema({
    author: { type: String, required: true, maxlength: 60 },
    message: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false }
}));

const SiteSettings = mongoose.model('SiteSettings', new mongoose.Schema({
    currently: {
        type: [String],
        default: ['✍️ Escrevendo uma história nova', '🎨 Desenhando bobagens fofas', '📖 Aprendendo algo novo']
    },
    moodEmoji: { type: String, default: '🐸' },
    moodLabel: { type: String, default: 'tranquila' },
    nowPlayingTrack: { type: String, default: 'lofi in the swamp' },
    nowPlayingArtist: { type: String, default: 'frog beats' },
    featuredCaption: { type: String, default: 'tempo perfeito pra programar ☂️' },
    updatedAt: { type: Date, default: Date.now }
}));

async function getOrCreateSettings() {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    return settings;
}

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


const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif|webp/;
        const mimeType = fileTypes.test(file.mimetype);
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimeType && extName) return cb(null, true);
        cb(new Error('Apenas arquivos de imagem são permitidos (JPEG, PNG, GIF).'));
    }
});

const galleryUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]);

function requireAuth(req, res, next) {
    if (!req.session.isAdmin) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    next();
}

const { body, validationResult } = require('express-validator');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const commentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas tentativas de comentário. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const guestbookLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas mensagens no guestbook. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rota de login
app.post('/login', loginLimiter, [
    body('username').notEmpty().withMessage('Usuário é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, password } = req.body;
        const validUsername = username === process.env.ADMIN_USERNAME;
        const validPassword = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH || '');
        if (!validUsername || !validPassword) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error('Erro ao regenerar sessão:', err);
                return res.status(500).json({ message: 'Erro no servidor' });
            }
            req.session.isAdmin = true;
            req.session.username = process.env.ADMIN_USERNAME;
            res.status(200).json({ message: 'Login bem-sucedido' });
        });

    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para buscar informações do usuário
app.get('/user-info', requireAuth, (req, res) => {
    res.json({ username: req.session.username });
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


app.post('/addPost', requireAuth, galleryUpload, async (req, res) => {
    try {
        const { title, content, url, status, external_link, preview_link } = req.body;
        let categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        let technologies = req.body.technologies ? JSON.parse(req.body.technologies) : [];
        const imageFile = req.files?.['image']?.[0];
        const image_path = imageFile ? await uploadToCloudinary(imageFile.buffer) : null;
        const galleryFiles = req.files?.['gallery'] || [];
        const gallery = await Promise.all(galleryFiles.map(f => uploadToCloudinary(f.buffer)));
        const slug = await uniqueSlug(title);

        const newPost = new Post({
            title, content, url, image_path, categories, technologies, gallery,
            slug,
            external_link: external_link || '',
            preview_link: preview_link || '',
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
app.post('/editPost/:id', requireAuth, galleryUpload, async (req, res) => {
    try {
        const postId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: 'ID de post inválido' });
        }

        const { title, content, url, external_link, preview_link } = req.body;
        const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        const technologies = req.body.technologies ? JSON.parse(req.body.technologies) : [];
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado' });
        }

        // Atualiza os campos
        post.title = title;
        post.content = content;
        post.url = url;
        post.categories = categories;
        post.technologies = technologies;
        post.external_link = external_link || '';
        post.preview_link = preview_link || '';

        const imageFile = req.files?.['image']?.[0];
        if (imageFile) {
            post.image_path = await uploadToCloudinary(imageFile.buffer);
        }

        let keepGallery = [];
        try { keepGallery = JSON.parse(req.body.gallery_keep || '[]'); } catch(e) {}
        const newGalleryFiles = req.files?.['gallery'] || [];
        const newGalleryUrls = await Promise.all(newGalleryFiles.map(f => uploadToCloudinary(f.buffer)));
        post.gallery = [...keepGallery, ...newGalleryUrls];

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

        filter.status = { $ne: 'draft' };
        const posts = await Post.find(filter);
        res.json(posts);
    } catch (err) {
        console.error('Erro na pesquisa:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/user-posts', requireAuth, async (req, res) => {
    try {
        const posts = await Post.find({}).sort({ publish_date: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar postagens do usuário:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const [allPosts, recentPosts] = await Promise.all([
            Post.find({}),
            Post.find({}).sort({ publish_date: -1 }).limit(3)
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

// Rota para carregar post no editor (sem incrementar views)
app.get('/posts/:id/data', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID inválido' });
        }
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ success: false, message: 'Post não encontrado' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// ── Comentários ──────────────────────────────────────────

app.post('/comments', commentLimiter, [
    body('author').trim().notEmpty().isLength({ max: 60 }).withMessage('Nome inválido'),
    body('content').trim().notEmpty().isLength({ max: 1000 }).withMessage('Comentário inválido'),
    body('postId').notEmpty().withMessage('Post inválido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { postId, author, content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Post inválido' });
    try {
        const comment = new Comment({ post: postId, author: author.trim(), content: content.trim() });
        await comment.save();
        res.json({ success: true, message: 'Comentário enviado para moderação!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar comentário' });
    }
});

app.get('/comments/:postId', async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Post inválido' });
    try {
        const comments = await Comment.find({ post: postId, approved: true }).sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar comentários' });
    }
});

app.get('/admin/comments/pending', requireAuth, async (req, res) => {
    try {
        const comments = await Comment.find({ approved: false })
            .populate('post', 'title slug _id')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar comentários pendentes' });
    }
});

app.patch('/admin/comments/:id/approve', requireAuth, async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
        if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao aprovar comentário' });
    }
});

app.delete('/admin/comments/:id', requireAuth, async (req, res) => {
    try {
        const comment = await Comment.findByIdAndDelete(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar comentário' });
    }
});

// ── Guestbook ────────────────────────────────────────────

app.post('/guestbook', guestbookLimiter, [
    body('author').trim().notEmpty().isLength({ max: 60 }).withMessage('Nome inválido'),
    body('message').trim().notEmpty().isLength({ max: 500 }).withMessage('Mensagem inválida')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { author, message } = req.body;
    try {
        const entry = new GuestbookEntry({ author: author.trim(), message: message.trim() });
        await entry.save();
        res.json({ success: true, message: 'Mensagem enviada para moderação!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar mensagem' });
    }
});

app.get('/guestbook', async (req, res) => {
    try {
        const entries = await GuestbookEntry.find({ approved: true }).sort({ createdAt: -1 }).limit(20);
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar guestbook' });
    }
});

app.get('/admin/guestbook/pending', requireAuth, async (req, res) => {
    try {
        const entries = await GuestbookEntry.find({ approved: false }).sort({ createdAt: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar mensagens pendentes' });
    }
});

app.patch('/admin/guestbook/:id/approve', requireAuth, async (req, res) => {
    try {
        const entry = await GuestbookEntry.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
        if (!entry) return res.status(404).json({ message: 'Mensagem não encontrada' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao aprovar mensagem' });
    }
});

app.delete('/admin/guestbook/:id', requireAuth, async (req, res) => {
    try {
        const entry = await GuestbookEntry.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Mensagem não encontrada' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar mensagem' });
    }
});

// ── Configurações do site (widgets: currently / mood / now playing) ──────

app.get('/settings', async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar configurações' });
    }
});

app.put('/admin/settings', requireAuth, [
    body('currently').optional({ nullable: true }).isArray().withMessage('Currently deve ser uma lista'),
    body('moodEmoji').optional({ nullable: true }).trim().isLength({ max: 10 }).withMessage('Emoji muito longo'),
    body('moodLabel').optional({ nullable: true }).trim().isLength({ max: 60 }).withMessage('Humor muito longo'),
    body('nowPlayingTrack').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Nome da música muito longo'),
    body('nowPlayingArtist').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Nome do artista muito longo'),
    body('featuredCaption').optional({ nullable: true }).trim().isLength({ max: 120 }).withMessage('Legenda muito longa'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const settings = await getOrCreateSettings();
        const { currently, moodEmoji, moodLabel, nowPlayingTrack, nowPlayingArtist, featuredCaption } = req.body;
        if (currently !== undefined) {
            settings.currently = currently.map(c => String(c).trim()).filter(Boolean).slice(0, 10);
        }
        if (moodEmoji !== undefined) settings.moodEmoji = moodEmoji;
        if (moodLabel !== undefined) settings.moodLabel = moodLabel;
        if (nowPlayingTrack !== undefined) settings.nowPlayingTrack = nowPlayingTrack;
        if (nowPlayingArtist !== undefined) settings.nowPlayingArtist = nowPlayingArtist;
        if (featuredCaption !== undefined) settings.featuredCaption = featuredCaption;
        settings.updatedAt = new Date();
        await settings.save();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar configurações' });
    }
});

// Tratamento de erros do Multer
app.use((err, req, res, next) => {
    if (err && err.name === 'MulterError') {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'Imagem muito grande. O limite é 2 MB.'
            : `Erro no upload: ${err.message}`;
        return res.status(400).json({ success: false, message: msg });
    }
    if (err && err.message && err.message.includes('imagem')) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
});

// Servir arquivos estáticos
app.use(express.static('public'));

// Iniciar servidor (ignorado no Vercel serverless)
if (process.env.VERCEL !== '1') {
    app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
}

module.exports = app;
