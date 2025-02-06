const express = require('express'); 
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json()); // Isso garante que o JSON será parseado
app.use(cors()); // Permite requisições de diferentes origens

// Configurar a conexão MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'etQwHF|{oL0(&eMn', 
    database: 'floresta_criativa'
});

const session = require('express-session');
const bcrypt = require('bcryptjs');

// Configuração de sessões
app.use(session({
    secret: 'segredo_muito_seguro',
    resave: false,
    saveUninitialized: false
    
}));

// Rota de registro de usuários
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    // Verifica se o email já está registrado
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).send('Erro no servidor');
        if (results.length > 0) return res.status(400).send('Email já registrado');

        // Hash da senha
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insere o novo usuário
        const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(insertQuery, [username, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).send('Erro ao registrar');
            res.status(200).send('Usuário registrado com sucesso');
        });
    });
});

// Rota de login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).send('Erro no servidor');
        if (results.length === 0) return res.status(400).send('Usuário não encontrado');

        const user = results[0];

        // Verifica a senha
        if (bcrypt.compareSync(password, user.password)) {
            // Armazena o usuário na sessão
            req.session.userId = user.id;
            req.session.username = user.username;
            res.status(200).send('Login bem-sucedido');
        } else {
            res.status(400).send('Senha incorreta');
        }
    });
});

// Rota de logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Erro ao deslogar');
        res.send('Logout realizado com sucesso');
    });
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

// Rota protegida para o dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});


app.get('/user-info', isAuthenticated, (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).send('Usuário não autenticado');
    }
});

app.get('/dashboard-stats', isAuthenticated, (req, res) => {
    const query = 'SELECT COUNT(*) AS totalPosts FROM posts WHERE user_id = ?'; // Supondo que você tenha um campo user_id na tabela de posts
    db.query(query, [req.session.userId], (err, result) => {
        if (err) {
            return res.status(500).send('Erro ao buscar estatísticas');
        }
        res.json(result[0]);
    });
});



// Protegendo rotas
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(401).send('Por favor, faça login para acessar essa página');
}

// Exemplo de rota protegida
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.send(`Bem-vindo, ${req.session.username}!`);
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar no MySQL:', err);
        return;
    }
    console.log('Conectado ao MySQL');
});


// Rota de pesquisa
// Rota de pesquisa
app.get('/search', (req, res) => {
    const searchTerm = req.query.q || '';  // Termo de busca
    const categories = req.query.category ? req.query.category.split(',') : [];  // Categorias selecionadas
    const startDate = req.query.startDate || '1900-01-01';  // Data inicial
    const endDate = req.query.endDate || '2100-12-31';  // Data final
  
    // Base da consulta SQL
    let query = `
      SELECT p.*, GROUP_CONCAT(c.name) AS categories 
      FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      JOIN categories c ON pc.category_id = c.id
      WHERE (publish_date BETWEEN ? AND ?)
    `;
    const params = [startDate, endDate];
  
    // Adicionar o termo de busca se ele existir
    if (searchTerm) {
      query += ` AND (p.title LIKE ? OR p.content LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
  
    // Verificação de categorias selecionadas
    if (categories.length > 0) {
      const categoryPlaceholders = categories.map(() => '?').join(',');
      query += ` AND c.name IN (${categoryPlaceholders})`;
      params.push(...categories);
    }
  
    query += ' GROUP BY p.id';  // Agrupa os resultados por post
    console.log('Consulta SQL:', query);
    console.log('Parâmetros:', params);
  
    // Executar a consulta
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Erro ao executar a consulta:', err);
        res.status(500).send('Erro no servidor');
        return;
      }
  
      // Retorna os resultados como JSON
      res.json(results);
    });
  });
  

const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Definir o caminho completo para a pasta de uploads
const uploadDir = 'C:/Users/caelu/OneDrive/Área de Trabalho/Histórias/Floresta Criativa/public/imagens/uploads';

// Verificar se o diretório existe, caso contrário, criá-lo
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });  // O { recursive: true } cria diretórios aninhados, se necessário
}

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);  // Diretório onde as imagens serão salvas
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);  // Nome do arquivo com timestamp
    }
});

// Configuração do Multer com limite de tamanho e filtro de tipo de arquivo
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // Limite de 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);  // Aceita arquivos de imagem
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
});


// Rota para adicionar o post
app.post('/addPost', upload.single('image'), (req, res) => {
    const { title, content, url } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    const categories = req.body.category || [];  // Captura o array de categorias

    // Inserir o post na tabela 'posts', usando NOW() para data e hora automática
    const queryPost = `
        INSERT INTO posts (title, content, url, image_path, publish_date)
        VALUES (?, ?, ?, ?, NOW())
    `;

    db.query(queryPost, [title, content, url, imagePath], (err, result) => {
        if (err) {
            console.error('Erro ao inserir o post:', err);
            res.status(500).send('Erro no servidor');
            return;
        }

        const postId = result.insertId;  // Pega o ID do post recém-inserido

        // Agora, associamos as categorias ao post na tabela 'post_categories'
        const queryCategory = `
            INSERT INTO post_categories (post_id, category_id)
            VALUES (?, ?)
        `;

        categories.forEach(categoryId => {
            db.query(queryCategory, [postId, categoryId], (err) => {
                if (err) {
                    console.error('Erro ao associar categoria ao post:', err);
                }
            });
        });

        res.status(200).send('Post e categorias adicionados com sucesso');
    });
});




// Rota para buscar todas as publicações
app.get('/posts', (req, res) => {
  const category = req.query.category || null;
  const url = req.query.url || null;

  let query = 'SELECT * FROM posts WHERE 1=1';
  const params = [];

  if (category) {
      query += ' AND category = ?';
      params.push(category);
  }

  if (url) {
      query += ' AND url = ?';
      params.push(url);
  }

  db.query(query, params, (err, results) => {
      if (err) {
          console.error('Erro ao buscar posts:', err);
          res.status(500).send('Erro no servidor');
      } else {
          res.json(results);
      }
  });
});


// Servir arquivos estáticos (HTML, CSS, etc.)
app.use(express.static('public'));


// Iniciar o servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});

// Rota para buscar os posts mais recentes (limitar a quantidade)
app.get('/recent-posts', (req, res) => {
  const query = 'SELECT * FROM posts ORDER BY publish_date DESC LIMIT 5'; // Pega os 5 posts mais recentes

  db.query(query, (err, results) => {
      if (err) {
          console.error('Erro ao buscar posts:', err);
          res.status(500).send('Erro no servidor');
      } else {
          const modifiedResults = results.map(post => {
              return {
                  ...post,
                  content: post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content, // Limita o conteúdo a 100 caracteres
              };
          });
          res.json(modifiedResults); // Envia os posts modificados
      }
  });
});

// Rota para buscar um post específico pelo ID
app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
console.log("ID do post:", postId);  // Verifique se o ID está sendo capturado corretamente

const query = `SELECT p.*, GROUP_CONCAT(c.name) AS category  
FROM posts p
LEFT JOIN post_categories pc ON p.id = pc.post_id
LEFT JOIN categories c ON pc.category_id = c.id
WHERE p.id = ?;
`;


  db.query(query, [postId], (err, result) => {
      if (err) {
          console.error('Erro ao buscar post:', err);
          res.status(500).send('Erro no servidor');
      } else {
        console.log(result);
          res.json(result[0]); // Retorna o post
          
      }
  });
});


  
  // Rota para buscar posts por URL
  app.get('/posts/:url', (req, res) => {
    const url = req.params.url;
    const query = 'SELECT * FROM posts WHERE url = ? ORDER BY publish_date DESC';
  
    db.query(query, [url], (err, results) => {
        if (err) {
            console.error('Erro ao buscar posts:', err);
            res.status(500).send('Erro no servidor');
        } else {
            res.json(results); // Envia os posts como JSON
        }
    });
  });
  
  // Rota para deletar uma postagem
app.delete('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const query = 'DELETE FROM posts WHERE id = ?';
  
    db.query(query, [postId], (err, result) => {
      if (err) {
        console.error('Erro ao deletar a postagem:', err);
        return res.status(500).send('Erro no servidor');
      }
  
      res.status(200).send('Postagem excluída com sucesso');
    });
  });
  
  app.put('/post/:id', upload.single('image'), (req, res) => {
    const postId = req.params.id;
    const { title, content, categories } = req.body;
    const imagePath = req.file ? req.file.filename : null;

    // Atualiza o post
    const query = `
        UPDATE posts SET title = ?, content = ?, image_path = ?
        WHERE id = ?
    `;

    db.query(query, [title, content, imagePath, postId], (err) => {
        if (err) {
            console.error('Erro ao atualizar o post:', err);
            return res.status(500).send('Erro ao atualizar o post');
        }

        // Atualizar as categorias associadas (exemplo básico)
        const deleteQuery = 'DELETE FROM post_categories WHERE post_id = ?';
        db.query(deleteQuery, [postId], (err) => {
            if (err) {
                console.error('Erro ao remover categorias antigas:', err);
            }

            const insertQuery = 'INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)';
            categories.forEach(categoryId => {
                db.query(insertQuery, [postId, categoryId], (err) => {
                    if (err) {
                        console.error('Erro ao associar nova categoria:', err);
                    }
                });
            });

            res.status(200).send('Postagem atualizada com sucesso');
        });
    });
});

app.post('/editPost/:id', upload.single('image'), (req, res) => {
    const postId = req.params.id;
    const { title, content, url } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    let categories = req.body.categories;

    // Verifica se o campo categories foi enviado e o parseia como JSON
    if (categories) {
        categories = JSON.parse(categories);
    } else {
        categories = []; // Se não houver categorias, define como um array vazio
    }

    const updateQuery = `
        UPDATE posts SET title = ?, content = ?, image_path = ?, url = ? 
        WHERE id = ?
    `;

    db.query(updateQuery, [title, content, imagePath, url, postId], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar post:', err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar post' });
        }

        // Atualiza as categorias (exemplo básico)
        const deleteCategoriesQuery = 'DELETE FROM post_categories WHERE post_id = ?';
        db.query(deleteCategoriesQuery, [postId], (err) => {
            if (err) {
                console.error('Erro ao deletar categorias antigas:', err);
                return res.status(500).json({ success: false, message: 'Erro ao atualizar categorias' });
            }

            const insertCategoryQuery = 'INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)';
            categories.forEach(categoryId => {
                db.query(insertCategoryQuery, [postId, categoryId], (err) => {
                    if (err) {
                        console.error('Erro ao associar nova categoria:', err);
                    }
                });
            });

            res.status(200).json({ success: true, message: 'Post atualizado com sucesso!' });
        });
    });
});
