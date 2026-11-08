require('dotenv').config();

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET não está configurada — defina a variável de ambiente antes de subir o servidor.');
}

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
const { Resend } = require('resend');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(s) {
    return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function buildSiteUrl(req) {
    return process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
}

function buildPostLink(post, siteUrl) {
    return post.slug ? `${siteUrl}/post.html?slug=${post.slug}` : `${siteUrl}/post.html?id=${post._id}`;
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

function getCloudinaryPublicId(url) {
    if (typeof url !== 'string') return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
    return match ? match[1] : null;
}

// Apaga uma imagem no Cloudinary a partir da sua secure_url. Nunca lança — uma falha aqui não
// pode derrubar a operação de post que a chamou (o registro no Mongo já mudou/sumiu).
async function deleteFromCloudinary(url) {
    const publicId = getCloudinaryPublicId(url);
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('Erro ao apagar imagem do Cloudinary:', publicId, err);
    }
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
    secret: process.env.SESSION_SECRET,
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
    title_en: { type: String, default: '' },
    content_en: { type: String, default: '' },
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
    gallery: { type: [String], default: [] },
    postType: { type: String, enum: ['post', 'story_index', 'chapter'], default: 'post' },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    chapterNumber: { type: Number, default: null }
}));

const Comment = mongoose.model('Comment', new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: String, required: true, maxlength: 60 },
    content: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false },
    archived: { type: Boolean, default: false }
}));

const GuestbookEntry = mongoose.model('GuestbookEntry', new mongoose.Schema({
    author: { type: String, required: true, maxlength: 60 },
    message: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false },
    archived: { type: Boolean, default: false }
}));

const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({
    email: { type: String, required: true, unique: true, maxlength: 200 },
    lang: { type: String, enum: ['pt', 'en'], default: 'pt' },
    unsubscribeToken: { type: String, default: () => crypto.randomBytes(20).toString('hex') },
    createdAt: { type: Date, default: Date.now }
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
    const settings = await getSettingsWithSpotifyToken();
    return !!settings.spotifyRefreshToken;
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

const subscribeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas tentativas de inscrição. Tente novamente em 1 hora.' },
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
    body('title_en').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Título em inglês muito longo'),
    body('url').trim().notEmpty().withMessage('URL é obrigatória')
];

const POST_TYPES = ['post', 'story_index', 'chapter'];

// Para posts do tipo 'chapter', a seção (`url`) é sempre herdada do post-índice no servidor —
// nunca confiamos no valor enviado pelo client, pra um capítulo não "vazar" pra uma seção
// diferente da história (o form só preenche isso escondido por conveniência visual).
async function resolvePostTypeFields(reqBody) {
    const postType = POST_TYPES.includes(reqBody.postType) ? reqBody.postType : 'post';
    if (postType !== 'chapter') {
        return { postType, storyId: null, chapterNumber: null, url: reqBody.url };
    }
    const storyId = reqBody.storyId;
    if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
        throw new Error('Selecione a história a que este capítulo pertence.');
    }
    const story = await Post.findById(storyId);
    if (!story || story.postType !== 'story_index') {
        throw new Error('História não encontrada.');
    }
    const chapterNumber = reqBody.chapterNumber ? parseInt(reqBody.chapterNumber) : null;
    return { postType, storyId, chapterNumber, url: story.url };
}

app.post('/addPost', requireAuth, galleryUpload, postValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }
    try {
        const { title, content, status, external_link, preview_link } = req.body;
        const title_en = (req.body.title_en || '').trim();
        const content_en = (req.body.content_en || '').trim();
        let categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        let technologies = req.body.technologies ? JSON.parse(req.body.technologies) : [];
        const { postType, storyId, chapterNumber, url } = await resolvePostTypeFields(req.body);
        const imageFile = req.files?.['image']?.[0];
        const image_path = imageFile ? await uploadToCloudinary(imageFile.buffer) : null;
        const galleryFiles = req.files?.['gallery'] || [];
        const gallery = await Promise.all(galleryFiles.map(f => uploadToCloudinary(f.buffer)));
        const slug = await uniqueSlug(title);

        const newPost = new Post({
            title, content, title_en, content_en, url, image_path, categories, technologies, gallery,
            slug, postType, storyId, chapterNumber,
            external_link: external_link || '',
            preview_link: preview_link || '',
            status: status === 'draft' ? 'draft' : 'published'
        });

        await newPost.save();
        res.json({ success: true, message: 'Post publicado com sucesso!', slug: newPost.slug });

        if (newPost.status === 'published') {
            notifySubscribersOfNewPost(newPost, req).catch(err => console.error('Erro ao notificar inscritos:', err));
        }
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

        const { title, content, status, external_link, preview_link } = req.body;
        const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        const technologies = req.body.technologies ? JSON.parse(req.body.technologies) : [];
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado' });
        }

        const { postType, storyId, chapterNumber, url } = await resolvePostTypeFields(req.body);
        const previousUrl = post.url;
        const wasPublished = post.status === 'published';

        // Atualiza os campos
        post.title = title;
        post.content = content;
        post.title_en = (req.body.title_en || '').trim();
        post.content_en = (req.body.content_en || '').trim();
        post.url = url;
        post.postType = postType;
        post.storyId = storyId;
        post.chapterNumber = chapterNumber;
        post.categories = categories;
        post.technologies = technologies;
        post.external_link = external_link || '';
        post.preview_link = preview_link || '';
        if (status === 'published' || status === 'draft') post.status = status;

        const imageFile = req.files?.['image']?.[0];
        let oldImagePath = null;
        if (imageFile) {
            oldImagePath = post.image_path;
            post.image_path = await uploadToCloudinary(imageFile.buffer);
        }

        let keepGallery = [];
        try { keepGallery = JSON.parse(req.body.gallery_keep || '[]'); } catch(e) {}
        const removedGalleryUrls = post.gallery.filter(url => !keepGallery.includes(url));
        const newGalleryFiles = req.files?.['gallery'] || [];
        const newGalleryUrls = await Promise.all(newGalleryFiles.map(f => uploadToCloudinary(f.buffer)));
        post.gallery = [...keepGallery, ...newGalleryUrls];

        await post.save();

        // Editar o post-índice de uma história e mudar de seção cascateia o `url` pros
        // capítulos filhos, senão eles ficam "presos" na seção antiga.
        if (post.postType === 'story_index' && post.url !== previousUrl) {
            await Post.updateMany({ storyId: post._id, postType: 'chapter' }, { url: post.url });
        }

        const staleImages = oldImagePath ? [...removedGalleryUrls, oldImagePath] : removedGalleryUrls;
        await Promise.all(staleImages.map(deleteFromCloudinary));

        res.json({ success: true, message: 'Post atualizado com sucesso!' });

        if (!wasPublished && post.status === 'published') {
            notifySubscribersOfNewPost(post, req).catch(err => console.error('Erro ao notificar inscritos:', err));
        }
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

// Rota para buscar posts. `url` (seção do site) e `storyId` (capítulos de uma história) são usos
// distintos e não devem ser combinados no mesmo request: `url` exclui capítulos (só aparece o
// post-índice nas páginas de seção), `storyId` busca justamente os capítulos daquela história.
app.get('/posts', async (req, res) => {
    const { url, page, limit, category, sort, storyId } = req.query;
    try {
        const query = { status: { $ne: 'draft' } };
        if (storyId) {
            if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'storyId inválido' });
            query.storyId = storyId;
            query.postType = 'chapter';
        } else if (url && typeof url === 'string') {
            query.url = url;
            query.postType = { $ne: 'chapter' };
        }
        if (category && typeof category === 'string') {
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
        if (url && typeof url === 'string') {
            query.url = url;
            query.postType = { $ne: 'chapter' };
        }
        const categories = await Post.distinct('categories', query);
        res.json(categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    } catch (err) {
        console.error('Erro ao buscar categorias:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Versão leve de /post/:id para o link "voltar para a história" na página de capítulo —
// não incrementa views (senão cada leitura de capítulo infla artificialmente as views do índice).
app.get('/posts/:id/brief', async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });
        const post = await Post.findById(id).select('_id title title_en slug postType');
        if (!post) return res.status(404).json({ message: 'Post não encontrado' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

app.get('/post/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = (mongoose.Types.ObjectId.isValid(id) && id.length === 24)
            ? { _id: id }
            : { slug: id };

        let post = await Post.findOne(filter);
        if (!post) return res.status(404).json({ success: false, message: 'Post não encontrado' });

        // Dedupe por sessão, mesmo padrão do like — sem isso, chamar essa rota em loop infla
        // views artificialmente e distorce o "mais popular" (views + likes + commentsCount).
        const viewedPosts = req.session.viewedPosts || [];
        const postIdStr = post._id.toString();
        if (!viewedPosts.includes(postIdStr)) {
            post = await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } }, { new: true });
            req.session.viewedPosts = [...viewedPosts, postIdStr];
        }

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

        if (post.postType === 'story_index') {
            const hasChapters = await Post.exists({ storyId: post._id, postType: 'chapter' });
            if (hasChapters) {
                return res.status(409).json({ message: 'Exclua os capítulos antes de excluir a história.' });
            }
        }

        await Post.findByIdAndDelete(req.params.id);

        const staleImages = post.image_path ? [...post.gallery, post.image_path] : post.gallery;
        await Promise.all(staleImages.map(deleteFromCloudinary));

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
        const { q, category, startDate, endDate, page, limit } = req.query;

        // Cria o filtro de busca
        const filter = {};
        if (q && typeof q === 'string') {
            const safeQ = escapeRegex(q);
            filter.$or = [
                { title: { $regex: safeQ, $options: 'i' } }, // Busca por título
                { content: { $regex: safeQ, $options: 'i' } } // Busca por conteúdo
            ];
        }
        if (category && typeof category === 'string') {
            const categories = category.split(',').map(c => c.trim()).filter(Boolean); // Converte para array
            if (categories.length) filter.categories = { $in: categories }; // Filtra pelas categorias
        }
        if (startDate || endDate) {
            filter.publish_date = {};
            if (startDate) filter.publish_date.$gte = new Date(startDate); // Data inicial
            if (endDate) filter.publish_date.$lte = new Date(endDate); // Data final
        }

        filter.status = { $ne: 'draft' };

        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, parseInt(limit) || 5);
            const skip = (pageNum - 1) * limitNum;
            const [posts, total] = await Promise.all([
                Post.find(filter).skip(skip).limit(limitNum),
                Post.countDocuments(filter)
            ]);
            return res.json({ posts, total });
        }

        const posts = await Post.find(filter);
        res.json(posts);
    } catch (err) {
        console.error('Erro na pesquisa:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Lista geral de gerenciação (managePosts.html): exclui capítulos por padrão, já que eles têm
// tela própria (gerenciarCapitulos.html). Passar ?storyId=X inverte isso e lista só os
// capítulos daquela história (incluindo rascunhos, pois é rota autenticada).
app.get('/user-posts', requireAuth, async (req, res) => {
    try {
        const { storyId } = req.query;
        let filter = { postType: { $ne: 'chapter' } };
        if (storyId) {
            if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'storyId inválido' });
            filter = { storyId, postType: 'chapter' };
        }
        const posts = await Post.find(filter, 'title status publish_date views chapterNumber').sort({ publish_date: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar postagens do usuário:', err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Post-índices do dono, com a contagem de capítulos de cada um (usado por gerenciarHistorias.html)
app.get('/user-stories', requireAuth, async (req, res) => {
    try {
        const stories = await Post.find({ postType: 'story_index' }).sort({ publish_date: -1 });
        const counts = await Post.aggregate([
            { $match: { postType: 'chapter', storyId: { $in: stories.map(s => s._id) } } },
            { $group: { _id: '$storyId', total: { $sum: 1 } } }
        ]);
        const countByStory = new Map(counts.map(c => [String(c._id), c.total]));
        const result = stories.map(s => ({ ...s.toObject(), chapterCount: countByStory.get(String(s._id)) || 0 }));
        res.json(result);
    } catch (err) {
        console.error('Erro ao buscar histórias:', err);
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
                        // Capítulos ficam de fora de totalPosts/draftCount — uma história de 30
                        // capítulos não deve inflar o "Total de Postagens" geral, eles têm
                        // contadores próprios (totalStories/totalChapters) abaixo.
                        totalPosts: { $sum: { $cond: [{ $ne: ['$postType', 'chapter'] }, 1, 0] } },
                        draftCount: { $sum: { $cond: [{ $and: [{ $ne: ['$postType', 'chapter'] }, { $eq: ['$status', 'draft'] }] }, 1, 0] } },
                        totalStories: { $sum: { $cond: [{ $eq: ['$postType', 'story_index'] }, 1, 0] } },
                        totalChapters: { $sum: { $cond: [{ $eq: ['$postType', 'chapter'] }, 1, 0] } },
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
        const { totalPosts = 0, draftCount = 0, totalStories = 0, totalChapters = 0, totalViews = 0 } = counts[0] || {};

        res.json({
            totalPosts,
            draftCount,
            publishedCount: totalPosts - draftCount,
            totalStories,
            totalChapters,
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
        const wasPublished = post.status === 'published';
        post.status = 'published';
        await post.save();
        res.json({ success: true });

        if (!wasPublished) {
            notifySubscribersOfNewPost(post, req).catch(err => console.error('Erro ao notificar inscritos:', err));
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Feed RSS
app.get('/feed.xml', async (req, res) => {
    try {
        const posts = await Post.find({ status: { $ne: 'draft' } }).sort({ publish_date: -1 }).limit(20);
        const siteUrl = buildSiteUrl(req);

        const items = posts.map(post => {
            const desc = stripHtml(post.content).substring(0, 200);
            const link = buildPostLink(post, siteUrl);
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

// E-mails transacionais (confirmação de inscrição + aviso de post novo) via Resend
const CONFIRM_EMAIL = {
    pt: { subject: '🐸 Inscrição confirmada — Floresta Criativa', greeting: 'Inscrição confirmada!', body: 'Você vai receber um aviso por aqui sempre que sair um post novo na Floresta Criativa. Obrigado por acompanhar 🐸' },
    en: { subject: '🐸 Subscription confirmed — Floresta Criativa', greeting: 'Subscription confirmed!', body: "You'll get an email here whenever a new post goes live on Floresta Criativa. Thanks for following 🐸" }
};

const NEW_POST_EMAIL = {
    pt: { subjectPrefix: '🌿 Novo post na Floresta Criativa: ', readMore: 'Ler o post completo', unsubscribe: 'Cancelar inscrição' },
    en: { subjectPrefix: '🌿 New post on Floresta Criativa: ', readMore: 'Read the full post', unsubscribe: 'Unsubscribe' }
};

function postField(post, field, lang) {
    if (lang === 'en') {
        const enValue = post[`${field}_en`];
        if (enValue) return enValue;
    }
    return post[field] || '';
}

async function notifySubscribersOfNewPost(post, req) {
    const subscribers = await Subscriber.find({});
    if (!subscribers.length) return;

    const siteUrl = buildSiteUrl(req);
    const link = buildPostLink(post, siteUrl);

    const emails = subscribers.map(sub => {
        const lang = sub.lang === 'en' ? 'en' : 'pt';
        const msgs = NEW_POST_EMAIL[lang];
        const title = postField(post, 'title', lang);
        const excerpt = stripHtml(postField(post, 'content', lang)).substring(0, 200);
        const unsubscribeLink = `${siteUrl}/api/unsubscribe?token=${sub.unsubscribeToken}`;
        return {
            from: RESEND_FROM,
            to: sub.email,
            subject: `${msgs.subjectPrefix}${title}`,
            html: `<p><strong>${title}</strong></p><p>${excerpt}${excerpt ? '...' : ''}</p><p><a href="${link}">${msgs.readMore}</a></p><hr><p style="font-size:12px;color:#888"><a href="${unsubscribeLink}">${msgs.unsubscribe}</a></p>`
        };
    });

    for (let i = 0; i < emails.length; i += 100) {
        const batch = emails.slice(i, i + 100);
        await resend.batch.send(batch);
    }
}

// Inscrição por e-mail
const SUBSCRIBE_MESSAGES = {
    pt: { email: 'E-mail inválido', already: 'Você já está inscrito(a)!', confirmed: 'Inscrição confirmada! Obrigado por acompanhar 🐸', saveError: 'Erro ao salvar inscrição' },
    en: { email: 'Invalid email', already: "You're already subscribed!", confirmed: 'Subscription confirmed! Thanks for following 🐸', saveError: 'Error saving subscription' }
};

app.post('/subscribe', subscribeLimiter, [
    body('email').trim().isEmail().withMessage('email')
], async (req, res) => {
    const lang = req.body.lang === 'en' ? 'en' : 'pt';
    const msgs = SUBSCRIBE_MESSAGES[lang];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const mapped = errors.array().map(e => ({ ...e, msg: msgs[e.msg] || e.msg }));
        return res.status(400).json({ errors: mapped });
    }
    try {
        const email = req.body.email.trim().toLowerCase();
        const exists = await Subscriber.exists({ email });
        if (exists) return res.json({ success: true, message: msgs.already });
        await Subscriber.create({ email, lang });
        res.json({ success: true, message: msgs.confirmed });

        const confirm = CONFIRM_EMAIL[lang];
        resend.emails.send({
            from: RESEND_FROM,
            to: email,
            subject: confirm.subject,
            html: `<p><strong>${confirm.greeting}</strong></p><p>${confirm.body}</p>`
        }).catch(err => console.error('Erro ao enviar e-mail de confirmação:', err));
    } catch (err) {
        res.status(500).json({ message: msgs.saveError });
    }
});

const UNSUBSCRIBE_PAGE = {
    pt: { title: 'Inscrição cancelada', done: 'Você foi removido(a) da nossa lista. Sentiremos sua falta! 🐸', invalid: 'Link inválido ou já usado.', back: 'Voltar pro site' },
    en: { title: 'Unsubscribed', done: "You've been removed from our list. We'll miss you! 🐸", invalid: 'Invalid or already used link.', back: 'Back to the site' }
};

function unsubscribePageHtml(lang, message, siteUrl) {
    const t = UNSUBSCRIBE_PAGE[lang];
    return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><title>${t.title}</title>
<style>body{font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#333}a{color:#4a7c59}</style>
</head><body><p>${message}</p><p><a href="${siteUrl}">${t.back}</a></p></body></html>`;
}

// Descadastro (link enviado no rodapé dos e-mails de post novo)
app.get('/unsubscribe', async (req, res) => {
    const siteUrl = buildSiteUrl(req);
    const token = req.query.token;
    const sub = token ? await Subscriber.findOne({ unsubscribeToken: token }) : null;
    if (!sub) {
        return res.send(unsubscribePageHtml('pt', UNSUBSCRIBE_PAGE.pt.invalid, siteUrl));
    }
    const lang = sub.lang === 'en' ? 'en' : 'pt';
    await Subscriber.deleteOne({ _id: sub._id });
    res.send(unsubscribePageHtml(lang, UNSUBSCRIBE_PAGE[lang].done, siteUrl));
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
        const postExists = await Post.exists({ _id: postId });
        if (!postExists) return res.status(404).json({ message: 'Post não encontrado' });

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
        const { page, limit } = req.query;
        const filter = { approved: false };
        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, parseInt(limit) || 20);
            const skip = (pageNum - 1) * limitNum;
            const [comments, total] = await Promise.all([
                Comment.find(filter).populate('post', 'title slug _id').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
                Comment.countDocuments(filter)
            ]);
            return res.json({ comments, total, page: pageNum, limit: limitNum });
        }
        const comments = await Comment.find(filter)
            .populate('post', 'title slug _id')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar comentários pendentes' });
    }
});

// Lista os comentários já aprovados (ativos e arquivados) pra gestão no dashboard
app.get('/admin/comments', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = { approved: true };
        if (req.query.status === 'archived') filter.archived = true;
        else if (req.query.status === 'active') filter.archived = { $ne: true };
        const [comments, total] = await Promise.all([
            Comment.find(filter).populate('post', 'title slug _id').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Comment.countDocuments(filter),
        ]);
        res.json({ comments, total, page, limit });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar comentários' });
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

app.patch('/admin/comments/:id/archive', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Comentário inválido' });
        const comment = await Comment.findByIdAndUpdate(req.params.id, { archived: true }, { new: true });
        if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao arquivar comentário' });
    }
});

app.patch('/admin/comments/:id/unarchive', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Comentário inválido' });
        const comment = await Comment.findByIdAndUpdate(req.params.id, { archived: false }, { new: true });
        if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao restaurar comentário' });
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

const GUESTBOOK_MESSAGES = {
    pt: { name: 'Nome inválido', message: 'Mensagem inválida', sent: 'Mensagem enviada para moderação!', saveError: 'Erro ao salvar mensagem' },
    en: { name: 'Invalid name', message: 'Invalid message', sent: 'Message sent for moderation!', saveError: 'Error saving message' }
};

app.post('/guestbook', guestbookLimiter, [
    body('author').trim().notEmpty().isLength({ max: 60 }).withMessage('name'),
    body('message').trim().notEmpty().isLength({ max: 500 }).withMessage('message')
], async (req, res) => {
    const lang = req.body.lang === 'en' ? 'en' : 'pt';
    const msgs = GUESTBOOK_MESSAGES[lang];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const mapped = errors.array().map(e => ({ ...e, msg: msgs[e.msg] || e.msg }));
        return res.status(400).json({ errors: mapped });
    }
    const { author, message } = req.body;
    try {
        const entry = new GuestbookEntry({ author: author.trim(), message: message.trim() });
        await entry.save();
        res.json({ success: true, message: msgs.sent });
    } catch (err) {
        res.status(500).json({ message: msgs.saveError });
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
        const { page, limit } = req.query;
        const filter = { approved: false };
        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, parseInt(limit) || 20);
            const skip = (pageNum - 1) * limitNum;
            const [entries, total] = await Promise.all([
                GuestbookEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
                GuestbookEntry.countDocuments(filter)
            ]);
            return res.json({ entries, total, page: pageNum, limit: limitNum });
        }
        const entries = await GuestbookEntry.find(filter).sort({ createdAt: -1 });
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

// ── Animes: lista de assistidos / assistindo / quero ver ─────────────────

const ANIME_STATUSES = ['assistindo', 'assistido', 'quero_ver', 'pausado', 'abandonado'];

const Anime = mongoose.model('Anime', new mongoose.Schema({
    title: { type: String, required: true, maxlength: 200 },
    status: { type: String, enum: ANIME_STATUSES, default: 'quero_ver' },
    rating: { type: Number, min: 0, max: 10, default: null },
    episodesWatched: { type: Number, min: 0, default: 0 },
    episodesTotal: { type: Number, min: 0, default: null },
    cover: { type: String, default: '', maxlength: 500 },
    link: { type: String, default: '', maxlength: 500 },
    notes: { type: String, default: '', maxlength: 500 },
    malId: { type: Number, default: null },
    favorite: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}));

const animeValidators = [
    body('title').optional().trim().notEmpty().withMessage('O título é obrigatório').isLength({ max: 200 }),
    body('status').optional().isIn(ANIME_STATUSES).withMessage('Status inválido'),
    body('rating').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 10 }).withMessage('A nota vai de 0 a 10'),
    body('episodesWatched').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
    body('episodesTotal').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
    body('cover').optional({ nullable: true, checkFalsy: true }).trim().isURL({ protocols: ['https'], require_protocol: true }).withMessage('A capa precisa ser um link https'),
    body('link').optional({ nullable: true, checkFalsy: true }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('O link precisa começar com https://'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('Comentário muito longo (máx. 500)'),
    body('malId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
    body('favorite').optional().isBoolean(),
    body('startedAt').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('finishedAt').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

const ANIME_FIELDS = ['title', 'status', 'rating', 'episodesWatched', 'episodesTotal', 'cover', 'link', 'notes', 'malId', 'favorite', 'startedAt', 'finishedAt'];

// Ao marcar como assistido, completa episódios e data de término se estiverem vazios
function fillFinished(anime) {
    if (anime.status !== 'assistido') return;
    if (!anime.finishedAt) anime.finishedAt = new Date();
    if (anime.episodesTotal && !anime.episodesWatched) anime.episodesWatched = anime.episodesTotal;
}

function pickAnimeFields(src) {
    const out = {};
    for (const key of ANIME_FIELDS) {
        if (src[key] === undefined) continue;
        out[key] = src[key] === '' && !['notes', 'cover', 'link'].includes(key) ? null : src[key];
    }
    return out;
}

// Capas vindas do MyAnimeList são copiadas para o Cloudinary ao salvar, para não
// sumirem se o MAL mudar o endereço. Se a cópia falhar, fica o link original.
function isMalImage(url) {
    try { return /(^|\.)myanimelist\.net$/i.test(new URL(url).hostname); } catch (e) { return false; }
}
function isOurAnimeCover(url) {
    return typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/floresta-criativa/animes/');
}
async function mirrorAnimeCover(url) {
    if (!url || !isMalImage(url)) return url;
    try {
        const result = await cloudinary.uploader.upload(url, { folder: 'floresta-criativa/animes' });
        return result.secure_url || url;
    } catch (err) {
        console.error('Não consegui copiar a capa para o Cloudinary, mantendo o link do MAL:', err.message || err);
        return url;
    }
}

// Público: lista de animes, opcionalmente filtrada por status
// GET /api/animes?status=assistindo
app.get('/animes', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) {
            const statuses = String(req.query.status).split(',').filter(s => ANIME_STATUSES.includes(s));
            if (statuses.length) filter.status = { $in: statuses };
        }
        if (req.query.favorite === 'true') filter.favorite = true;
        const animes = await Anime.find(filter).sort({ favorite: -1, updatedAt: -1 }).lean();
        res.set('Cache-Control', 'public, max-age=60');
        res.json(animes);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar animes' });
    }
});

// Público: contagem por status (para as abas)
app.get('/animes/stats', async (req, res) => {
    try {
        const rows = await Anime.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const stats = Object.fromEntries(ANIME_STATUSES.map(s => [s, 0]));
        rows.forEach(r => { stats[r._id] = r.count; });
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
});

// Admin: busca no MyAnimeList (via Jikan, sem chave) para preencher capa/episódios
// GET /api/admin/animes/search?q=frieren
app.get('/admin/animes/search', requireAuth, async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (q.length < 2) return res.json([]);
    try {
        const url = `https://api.jikan.moe/v4/anime?limit=8&sfw=true&q=${encodeURIComponent(q)}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return res.status(502).json({ message: 'A busca do MyAnimeList não respondeu, tente de novo' });
        const { data = [] } = await r.json();
        res.json(data.map(a => ({
            malId: a.mal_id,
            title: a.title,
            titleEnglish: a.title_english || '',
            episodesTotal: a.episodes || null,
            cover: a.images?.webp?.image_url || a.images?.jpg?.image_url || '',
            year: a.year || a.aired?.prop?.from?.year || null,
            type: a.type || '',
            link: a.url || ''
        })));
    } catch (err) {
        res.status(502).json({ message: 'A busca do MyAnimeList não respondeu, tente de novo' });
    }
});

app.post('/admin/animes', requireAuth, animeValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.body.title || !String(req.body.title).trim()) {
        return res.status(400).json({ message: 'O título é obrigatório' });
    }
    try {
        const fields = pickAnimeFields(req.body);
        if (fields.cover) fields.cover = await mirrorAnimeCover(fields.cover);
        const anime = new Anime(fields);
        fillFinished(anime);
        await anime.save();
        res.status(201).json(anime);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao salvar anime' });
    }
});

app.put('/admin/animes/:id', requireAuth, animeValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Anime não encontrado' });
    try {
        const anime = await Anime.findById(req.params.id);
        if (!anime) return res.status(404).json({ message: 'Anime não encontrado' });
        const fields = pickAnimeFields(req.body);
        const oldCover = anime.cover;
        if (fields.cover && fields.cover !== oldCover) fields.cover = await mirrorAnimeCover(fields.cover);
        anime.set({ ...fields, updatedAt: new Date() });
        fillFinished(anime);
        await anime.save();
        // Capa trocada: apaga a cópia antiga do Cloudinary
        if (fields.cover !== undefined && fields.cover !== oldCover && isOurAnimeCover(oldCover)) deleteFromCloudinary(oldCover);
        res.json(anime);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar anime' });
    }
});

app.delete('/admin/animes/:id', requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Anime não encontrado' });
    try {
        const anime = await Anime.findByIdAndDelete(req.params.id);
        if (!anime) return res.status(404).json({ message: 'Anime não encontrado' });
        if (isOurAnimeCover(anime.cover)) deleteFromCloudinary(anime.cover);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao excluir anime' });
    }
});

// ── SEO: sitemap e prévia dos posts para buscadores/redes sociais ──────────
// Endereço "oficial" do site, usado em canonical, sitemap e og:url (o domínio
// floresta-criativa.vercel.app aponta pra cá como cópia).
const CANONICAL_SITE = (process.env.SITE_URL || 'https://nayfts.dev').replace(/\/$/, '');
const fs = require('fs');

function escapeAttr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// O conteúdo vem do CKEditor com entidades HTML (&nbsp;, &amp;...); decodifica antes de escapar de novo
function decodeEntities(s) {
    return String(s || '')
        .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ').trim();
}

function postImageUrl(post) {
    if (!post.image_path) return `${CANONICAL_SITE}/imagens/og-image.jpg`;
    return post.image_path.startsWith('http') ? post.image_path : `${CANONICAL_SITE}/imagens/uploads/${post.image_path}`;
}

// Recebe o HTML do post.html e devolve com título, descrição e tags og:/twitter:
// já preenchidos — WhatsApp, Instagram e o Google leem isso sem rodar JavaScript.
function renderPostMeta(html, post) {
    const title = post.title || 'Floresta Criativa';
    const desc = decodeEntities(stripHtml(post.content)).substring(0, 160);
    const url = buildPostLink(post, CANONICAL_SITE);
    const img = postImageUrl(post);
    const set = (re, tag) => (re.test(html) ? (html = html.replace(re, tag)) : html);
    set(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)} — Floresta Criativa</title>`);
    set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(desc)}">`);
    set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(title)}">`);
    set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(desc)}">`);
    set(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeAttr(img)}">`);
    const extra = `<link rel="canonical" href="${escapeAttr(url)}">` +
        `<meta property="og:url" content="${escapeAttr(url)}">` +
        `<meta property="og:locale" content="pt_BR">`;
    return html.replace('</head>', `${extra}</head>`);
}

let postTemplateCache = null;
function readPostTemplate() {
    if (!postTemplateCache) {
        postTemplateCache = fs.readFileSync(path.join(__dirname, '..', 'public', 'post.html'), 'utf8');
    }
    return postTemplateCache;
}

// GET /post.html?slug=... (roteado pelo vercel.json) — mesma página de sempre,
// só que com as meta tags do post. Se algo der errado, serve a página sem mudança.
app.get('/post.html', async (req, res) => {
    let html;
    try {
        html = readPostTemplate();
    } catch (err) {
        console.error('post.html não encontrado para renderizar meta tags:', err);
        return res.status(500).send('Erro ao carregar a página');
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    try {
        const id = String(req.query.slug || req.query.id || '');
        if (!id) return res.send(html);
        const filter = (mongoose.Types.ObjectId.isValid(id) && id.length === 24) ? { _id: id } : { slug: id };
        const post = await Post.findOne({ ...filter, status: { $ne: 'draft' } }).lean();
        res.send(post ? renderPostMeta(html, post) : html);
    } catch (err) {
        console.error('Erro ao gerar meta tags do post:', err);
        res.send(html);
    }
});

// GET /sitemap.xml (roteado pelo vercel.json) — páginas fixas + todos os posts publicados
const SITEMAP_PAGES = ['/', '/rascunhos-da-floresta.html', '/sapo-imaginario.html', '/verde-inspiracao.html', '/sobre-mim.html', '/livro-de-visitas.html'];
app.get('/sitemap.xml', async (req, res) => {
    try {
        const posts = await Post.find({ status: { $ne: 'draft' } }, { slug: 1, publish_date: 1 }).sort({ publish_date: -1 }).lean();
        const urls = SITEMAP_PAGES.map(p => `  <url><loc>${CANONICAL_SITE}${p}</loc></url>`)
            .concat(posts.map(p => {
                const lastmod = p.publish_date ? `<lastmod>${new Date(p.publish_date).toISOString().slice(0, 10)}</lastmod>` : '';
                return `  <url><loc>${escapeAttr(buildPostLink(p, CANONICAL_SITE))}</loc>${lastmod}</url>`;
            }));
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=0, s-maxage=3600');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
    } catch (err) {
        console.error('Erro ao gerar sitemap:', err);
        res.status(500).send('Erro ao gerar sitemap');
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
