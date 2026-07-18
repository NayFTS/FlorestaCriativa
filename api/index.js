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
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

// Em ambiente serverless o processo pode ser reaproveitado entre requisições; guardamos a
// conexão em `global` para não abrir uma conexão nova a cada cold start/reload (isso é o que
// estava estourando o limite de conexões simultâneas do Atlas). maxPoolSize baixo porque cada
// instância da função já mantém seu próprio pool.
//
// O MongoStore da sessão (abaixo) é criado uma única vez e fica preso para sempre à promise
// que recebe nesse momento — se ela rejeitar, a sessão inteira quebra pro resto da vida dessa
// instância "quente", mesmo depois que uma nova tentativa de conexão teria dado certo. Por
// isso tentamos reconectar algumas vezes aqui antes de desistir, já que falhas de rede
// transitórias (ECONNRESET, handshake TLS) contra o Atlas são esperadas ocasionalmente.
async function connectWithRetry(uri, options, attempts = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const m = await mongoose.connect(uri, options);
            console.log(`Conectado ao MongoDB: ${uri.includes('localhost') ? 'Local' : 'Atlas'}`);
            return m;
        } catch (err) {
            console.error(`Erro ao conectar ao MongoDB (tentativa ${attempt}/${attempts}):`, err);
            if (attempt === attempts) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}

let mongoConnectPromise = global.__mongoConnectPromise;
if (!mongoConnectPromise) {
    mongoConnectPromise = connectWithRetry(mongoURI, { maxPoolSize: 5 })
        .catch(err => {
            global.__mongoConnectPromise = null;
            throw err;
        });
    global.__mongoConnectPromise = mongoConnectPromise;
}

// Necessário pro Express enxergar corretamente req.secure (via X-Forwarded-Proto) atrás do
// proxy da Vercel — sem isso, cookie.secure nunca é setado mesmo em produção HTTPS.
app.set('trust proxy', 1);

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
        clientPromise: mongoConnectPromise.then(m => m.connection.getClient()),
        collectionName: 'sessions'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
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
    likes: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
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
    approved: { type: Boolean, default: false },
    archived: { type: Boolean, default: false }
}));

const SiteSettings = mongoose.model('SiteSettings', new mongoose.Schema({
    currently: {
        type: [String],
        default: ['✍️ Escrevendo uma história nova', '🎨 Desenhando bobagens fofas', '📖 Aprendendo algo novo']
    },
    nowPlayingTrack: { type: String, default: 'lofi in the swamp' },
    nowPlayingArtist: { type: String, default: 'frog beats' },
    spotifyRefreshToken: { type: String, default: '', select: false },
    tools: {
        type: [{ name: String, desc: String, _id: false }],
        default: [{ name: 'VS Code', desc: 'código & desenvolvimento' }]
    },
    skills: {
        type: [String],
        default: ['Web Design', 'Front-end Dev', 'UI/UX Design']
    },
    aboutTools: {
        type: [{ name: String, desc: String, _id: false }],
        default: [
            { name: 'VS Code', desc: 'código & desenvolvimento' },
            { name: 'Claude', desc: 'IA — código & criatividade' }
        ]
    },
    aboutValues: {
        type: [String],
        default: ['Criatividade', 'Gentileza', 'Amor', 'Paciência', 'Sossego']
    },
    updatedAt: { type: Date, default: Date.now }
}));

async function getOrCreateSettings() {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    return settings;
}

// Refresh token nunca é selecionado por padrão (evita vazar no GET /settings público)
async function getSettingsWithSpotifyToken() {
    let settings = await SiteSettings.findOne().select('+spotifyRefreshToken');
    if (!settings) settings = await SiteSettings.create({});
    return settings;
}

async function isSpotifyConnected() {
    const s = await SiteSettings.findOne().select('+spotifyRefreshToken').lean();
    return !!(s && s.spotifyRefreshToken);
}

// Token de acesso do Spotify expira em ~1h; cacheado em memória entre requisições
// (só ajuda dentro da mesma instância "quente" da function, mas evita renovar a cada poll)
let spotifyAccessTokenCache = { token: null, expiresAt: 0 };

async function getSpotifyAccessToken(refreshToken) {
    if (spotifyAccessTokenCache.token && spotifyAccessTokenCache.expiresAt > Date.now()) {
        return spotifyAccessTokenCache.token;
    }
    const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const resp = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
    });
    if (!resp.ok) throw new Error('Falha ao renovar token do Spotify');
    const data = await resp.json();
    spotifyAccessTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000
    };
    return data.access_token;
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

const likeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { message: 'Muitas curtidas. Tente novamente em 1 hora.' },
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
            return res.status(500).json({ message: 'Erro ao fazer logout' });
        }
        res.clearCookie('connect.sid'); // Remove o cookie da sessão
        res.json({ message: 'Logout bem-sucedido' });
    });
});


const postValidators = [
    body('title').trim().notEmpty().withMessage('Título é obrigatório').isLength({ max: 200 }).withMessage('Título muito longo'),
    body('content').trim().notEmpty().withMessage('Conteúdo é obrigatório'),
    body('url').trim().notEmpty().withMessage('URL é obrigatória')
];

app.post('/addPost', requireAuth, galleryUpload, postValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }
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
app.post('/editPost/:id', requireAuth, galleryUpload, postValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }
    try {
        const postId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: 'ID de post inválido' });
        }

        const { title, content, url, status, external_link, preview_link } = req.body;
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
        if (status === 'published' || status === 'draft') post.status = status;

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




const POST_SORT_OPTIONS = {
    latest: { publish_date: -1 },
    oldest: { publish_date: 1 },
    likes: { likes: -1 },
    views: { views: -1 },
};

// Rota para buscar posts
app.get('/posts', async (req, res) => {
    const { url, page, limit, category, sort } = req.query;
    try {
        const query = { status: { $ne: 'draft' } };
        if (url) query.url = url;
        if (category) {
            const categories = category.split(',').map(c => c.trim()).filter(Boolean);
            if (categories.length) query.categories = { $in: categories };
        }
        const sortOption = POST_SORT_OPTIONS[sort] || POST_SORT_OPTIONS.latest;
        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, parseInt(limit) || 5);
            const skip = (pageNum - 1) * limitNum;
            const [posts, total] = await Promise.all([
                Post.find(query).sort(sortOption).skip(skip).limit(limitNum),
                Post.countDocuments(query)
            ]);
            return res.json({ posts, total });
        }
        const posts = await Post.find(query).sort(sortOption);
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar posts:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Categorias distintas usadas pelos posts publicados de uma página (para os filtros da listagem)
app.get('/posts/categories', async (req, res) => {
    try {
        const { url } = req.query;
        const query = { status: { $ne: 'draft' } };
        if (url) query.url = url;
        const categories = await Post.distinct('categories', query);
        res.json(categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    } catch (err) {
        console.error('Erro ao buscar categorias:', err);
        res.status(500).json({ message: 'Erro no servidor' });
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



app.post('/posts/:id/like', likeLimiter, async (req, res) => {
    try {
        const postId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Post inválido' });
        const likedPosts = req.session.likedPosts || [];
        if (likedPosts.includes(postId)) {
            const post = await Post.findById(postId);
            if (!post) return res.status(404).json({ message: 'Post não encontrado' });
            return res.json({ likes: post.likes });
        }

        const post = await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } }, { new: true });
        if (!post) return res.status(404).json({ message: 'Post não encontrado' });
        req.session.likedPosts = [...likedPosts, postId];
        res.json({ likes: post.likes });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao curtir post' });
    }
});

app.post('/posts/:id/unlike', likeLimiter, async (req, res) => {
    try {
        const postId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Post inválido' });
        const likedPosts = req.session.likedPosts || [];
        if (!likedPosts.includes(postId)) {
            const post = await Post.findById(postId);
            if (!post) return res.status(404).json({ message: 'Post não encontrado' });
            return res.json({ likes: post.likes });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post não encontrado' });
        post.likes = Math.max(0, post.likes - 1);
        await post.save();
        req.session.likedPosts = likedPosts.filter(id => id !== postId);
        res.json({ likes: post.likes });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao descurtir post' });
    }
});

// Rota para deletar posts
app.delete('/posts/:id', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Post inválido' });
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post não encontrado' });
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Postagem excluída com sucesso' });
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para buscar posts recentes
app.get('/recent-posts', async (req, res) => {
    try {
        const posts = await Post.find({ status: { $ne: 'draft' } }).sort({ publish_date: -1 }).limit(5);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar posts' });
    }
});

app.get('/search', async (req, res) => {
    try {
        const { q, category, startDate, endDate } = req.query;

        // Cria o filtro de busca
        const filter = {};
        if (q) {
            const safeQ = escapeRegex(q);
            filter.$or = [
                { title: { $regex: safeQ, $options: 'i' } }, // Busca por título
                { content: { $regex: safeQ, $options: 'i' } } // Busca por conteúdo
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
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.get('/user-posts', requireAuth, async (req, res) => {
    try {
        const posts = await Post.find({}, 'title status publish_date views').sort({ publish_date: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar postagens do usuário:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const [counts, [mostPopularPost], recentPosts] = await Promise.all([
            Post.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPosts: { $sum: 1 },
                        draftCount: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                        totalViews: { $sum: { $ifNull: ['$views', 0] } },
                    },
                },
            ]),
            Post.aggregate([
                {
                    $addFields: {
                        popularityScore: {
                            $add: [
                                { $ifNull: ['$views', 0] },
                                { $ifNull: ['$likes', 0] },
                                { $ifNull: ['$commentsCount', 0] },
                            ],
                        },
                    },
                },
                { $sort: { popularityScore: -1 } },
                { $limit: 1 },
            ]),
            Post.find({}).sort({ publish_date: -1 }).limit(3),
        ]);
        const { totalPosts = 0, draftCount = 0, totalViews = 0 } = counts[0] || {};

        res.json({
            totalPosts,
            draftCount,
            publishedCount: totalPosts - draftCount,
            totalViews,
            mostPopularPost: mostPopularPost ? mostPopularPost.title : 'Nenhuma postagem encontrada',
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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Post inválido' });
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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Comentário inválido' });
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
        if (!comment.approved) {
            comment.approved = true;
            await comment.save();
            await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: 1 } });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao aprovar comentário' });
    }
});

app.delete('/admin/comments/:id', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Comentário inválido' });
        const comment = await Comment.findByIdAndDelete(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
        if (comment.approved) {
            const post = await Post.findById(comment.post);
            if (post) {
                post.commentsCount = Math.max(0, post.commentsCount - 1);
                await post.save();
            }
        }
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
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = { approved: true, archived: { $ne: true } };
        const [entries, total] = await Promise.all([
            GuestbookEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            GuestbookEntry.countDocuments(filter),
        ]);
        res.json({ entries, total, page, limit });
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

// Lista as mensagens já aprovadas (ativas e arquivadas) pra gestão no dashboard
app.get('/admin/guestbook', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = { approved: true };
        if (req.query.status === 'archived') filter.archived = true;
        else if (req.query.status === 'active') filter.archived = { $ne: true };
        const [entries, total] = await Promise.all([
            GuestbookEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            GuestbookEntry.countDocuments(filter),
        ]);
        res.json({ entries, total, page, limit });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar mensagens do guestbook' });
    }
});

app.patch('/admin/guestbook/:id/approve', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Mensagem inválida' });
        const entry = await GuestbookEntry.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
        if (!entry) return res.status(404).json({ message: 'Mensagem não encontrada' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao aprovar mensagem' });
    }
});

app.patch('/admin/guestbook/:id/archive', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Mensagem inválida' });
        const entry = await GuestbookEntry.findByIdAndUpdate(req.params.id, { archived: true }, { new: true });
        if (!entry) return res.status(404).json({ message: 'Mensagem não encontrada' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao arquivar mensagem' });
    }
});

app.patch('/admin/guestbook/:id/unarchive', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Mensagem inválida' });
        const entry = await GuestbookEntry.findByIdAndUpdate(req.params.id, { archived: false }, { new: true });
        if (!entry) return res.status(404).json({ message: 'Mensagem não encontrada' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao restaurar mensagem' });
    }
});

app.delete('/admin/guestbook/:id', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Mensagem inválida' });
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
        const spotifyConnected = await isSpotifyConnected();
        res.json({ ...settings.toObject(), spotifyConnected });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar configurações' });
    }
});

function sanitizeToolsList(tools) {
    return tools
        .map(t => ({ name: String(t.name || '').trim().slice(0, 60), desc: String(t.desc || '').trim().slice(0, 100) }))
        .filter(t => t.name)
        .slice(0, 20);
}

function sanitizeStringList(items) {
    return items.map(s => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 20);
}

app.put('/admin/settings', requireAuth, [
    body('currently').optional({ nullable: true }).isArray().withMessage('Currently deve ser uma lista'),
    body('nowPlayingTrack').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Nome da música muito longo'),
    body('nowPlayingArtist').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Nome do artista muito longo'),
    body('tools').optional({ nullable: true }).isArray().withMessage('Tools deve ser uma lista'),
    body('skills').optional({ nullable: true }).isArray().withMessage('Skills deve ser uma lista'),
    body('aboutTools').optional({ nullable: true }).isArray().withMessage('About tools deve ser uma lista'),
    body('aboutValues').optional({ nullable: true }).isArray().withMessage('About values deve ser uma lista'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const settings = await getOrCreateSettings();
        const { currently, nowPlayingTrack, nowPlayingArtist, tools, skills, aboutTools, aboutValues } = req.body;
        if (currently !== undefined) {
            settings.currently = currently.map(c => String(c).trim()).filter(Boolean).slice(0, 10);
        }
        if (nowPlayingTrack !== undefined) settings.nowPlayingTrack = nowPlayingTrack;
        if (nowPlayingArtist !== undefined) settings.nowPlayingArtist = nowPlayingArtist;
        if (tools !== undefined) settings.tools = sanitizeToolsList(tools);
        if (skills !== undefined) settings.skills = sanitizeStringList(skills);
        if (aboutTools !== undefined) settings.aboutTools = sanitizeToolsList(aboutTools);
        if (aboutValues !== undefined) settings.aboutValues = sanitizeStringList(aboutValues);
        settings.updatedAt = new Date();
        await settings.save();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar configurações' });
    }
});

// ── Now Playing real via Spotify OAuth (Fase 30) ──────────────────────────

app.get('/admin/spotify/connect', requireAuth, (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.spotifyOAuthState = state;
    const params = new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        scope: 'user-read-currently-playing',
        state
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/spotify/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error || !code || !state || state !== req.session.spotifyOAuthState) {
        return res.redirect('/dashboard.html?spotify=error');
    }
    delete req.session.spotifyOAuthState;

    try {
        const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
        const resp = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI
            })
        });
        if (!resp.ok) throw new Error('Falha na troca de code por tokens');
        const data = await resp.json();

        const settings = await getOrCreateSettings();
        settings.spotifyRefreshToken = data.refresh_token;
        await settings.save();
        spotifyAccessTokenCache = { token: null, expiresAt: 0 };

        res.redirect('/dashboard.html?spotify=connected');
    } catch (err) {
        res.redirect('/dashboard.html?spotify=error');
    }
});

app.delete('/admin/spotify/disconnect', requireAuth, async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        settings.spotifyRefreshToken = '';
        await settings.save();
        spotifyAccessTokenCache = { token: null, expiresAt: 0 };
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao desconectar' });
    }
});

app.get('/spotify/now-playing', async (req, res) => {
    try {
        const settings = await getSettingsWithSpotifyToken();
        if (!settings.spotifyRefreshToken) return res.json({ connected: false });

        const accessToken = await getSpotifyAccessToken(settings.spotifyRefreshToken);
        const resp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (resp.status === 204) return res.json({ connected: true, playing: false });
        if (!resp.ok) return res.json({ connected: false });

        const data = await resp.json();
        if (!data || !data.item) return res.json({ connected: true, playing: false });

        res.json({
            connected: true,
            playing: !!data.is_playing,
            track: data.item.name,
            artist: (data.item.artists || []).map(a => a.name).join(', '),
            albumArt: data.item.album?.images?.[0]?.url || '',
            url: data.item.external_urls?.spotify || '',
            progressMs: data.progress_ms || 0,
            durationMs: data.item.duration_ms || 0
        });
    } catch (err) {
        res.json({ connected: false });
    }
});

// Tratamento de erros do Multer
app.use((err, req, res, next) => {
    if (err && err.name === 'MulterError') {
        let msg = `Erro no upload: ${err.message}`;
        if (err.code === 'LIMIT_FILE_SIZE') {
            const fieldLabel = err.field === 'image' ? 'da imagem de capa' : 'da galeria';
            msg = `Uma imagem ${fieldLabel} é muito grande. O limite é 2 MB por arquivo.`;
        }
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
