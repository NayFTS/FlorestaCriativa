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

// Conectar ao MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/floresta_criativa')
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));


// Configuração de sessão
app.use(session({
    secret: 'segredo_muito_seguro',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/floresta_criativa',
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
    categories: [String]
}));

// Configuração de armazenamento para uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/imagens/uploads');
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
});

// Rota de registro
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (await User.findOne({ email })) return res.status(400).send('Email já registrado');
        const hashedPassword = bcrypt.hashSync(password, 10);
        await new User({ username, email, password: hashedPassword }).save();
        res.status(200).send('Usuário registrado com sucesso');
    } catch (err) {
        res.status(500).send('Erro no servidor');
    }
});

// Rota de login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).send('Usuário ou senha incorretos');
        }
        req.session.userId = user._id;
        req.session.username = user.username;
        res.status(200).send('Login bem-sucedido');
    } catch (err) {
        res.status(500).send('Erro no servidor');
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

app.post('/addPost', upload.single('image'), async (req, res) => {
    try {
        const { title, content, url } = req.body;
        let categories = req.body.categories ? JSON.parse(req.body.categories) : [];

        const image_path = req.file ? `${req.file.filename}` : null;

        const newPost = new Post({ title, content, url, image_path, categories });
        await newPost.save();

        res.json({ success: true, message: 'Post publicado com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar o post:', err); // Exibe o erro no terminal
        res.status(500).json({ success: false, message: 'Erro ao salvar o post', error: err.message });
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


// Servir arquivos estáticos
app.use(express.static('public'));

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
