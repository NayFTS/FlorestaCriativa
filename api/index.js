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
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // 🔹 Agora os posts têm um autor vinculado
}));


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




// Rota para buscar informações do usuário
app.get('/user-info', async (req, res) => {
    if (!req.session.userId) return res.status(401).send('Usuário não autenticado');
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


app.post('/addPost', upload.single('image'), async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        }

        const { title, content, url } = req.body;
        let categories = req.body.categories ? JSON.parse(req.body.categories) : [];
        const image_path = req.file ? req.file.filename : null;

        const newPost = new Post({
            title,
            content,
            url,
            image_path,
            categories,
            author: req.session.userId
        });

        await newPost.save();
        res.json({ success: true, message: 'Post publicado com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar o post:', err);
        res.status(400).json({ success: false, message: err.message || 'Erro ao salvar o post' });
    }
});

// Rota de edição (exemplo semelhante)
app.post('/editPost/:id', upload.single('image'), async (req, res) => {
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
    const { url } = req.query; // Captura a URL da query string
    try {
        const posts = await Post.find({ url }); // Filtra posts pelo campo `url`
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar posts:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/post/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: 'ID de post inválido' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado' });
        }

        res.json(post);
    } catch (err) {
        console.error('Erro ao buscar post:', err);
        res.status(500).json({ success: false, message: 'Erro ao buscar post' });
    }
});



// Rota para deletar posts
app.delete('/posts/:id', async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.status(200).send('Postagem excluída com sucesso');
    } catch (err) {
        res.status(500).send('Erro no servidor');
    }
});

// Rota para buscar posts recentes
app.get('/recent-posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ publish_date: -1 }).limit(5);
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

app.get('/user-posts', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        const posts = await Post.find({ author: req.session.userId }).sort({ publish_date: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Erro ao buscar postagens do usuário:', err);
        res.status(500).send('Erro no servidor');
    }
});

app.get('/dashboard-stats', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        }

        const totalPosts = await Post.countDocuments({ author: req.session.userId });
        const mostPopularPost = await Post.findOne({ author: req.session.userId }).sort({ publish_date: -1 });
        const recentPosts = await Post.find({ author: req.session.userId }).sort({ publish_date: -1 }).limit(3);

        res.json({
            totalPosts,
            mostPopularPost: mostPopularPost ? mostPopularPost.title : 'Nenhuma postagem encontrada',
            recentPosts,
        });
    } catch (err) {
        console.error('Erro ao buscar estatísticas do dashboard:', err);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
});



// Servir arquivos estáticos
app.use(express.static('public'));

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
