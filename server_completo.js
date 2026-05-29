const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const port = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'connectfeliz';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dtyvrpoue',
  api_key:    process.env.CLOUDINARY_API_KEY    || '235998134975168',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'lIy_wyJ_W-PZ6ftL5qta5afSH74'
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'shelf-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

const staticDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;
app.use(express.static(staticDir));

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const seedData = [
  { rua: 'A', posicao: '01', nivel: 3, nome: 'Parafusos M8',           descricao: 'Caixa 500 unidades' },
  { rua: 'A', posicao: '01', nivel: 2, nome: 'Porcas M8',              descricao: 'Saco 1kg' },
  { rua: 'A', posicao: '01', nivel: 1, nome: 'Arruelas M8',            descricao: 'Caixa 1000 unidades' },
  { rua: 'A', posicao: '02', nivel: 3, nome: 'Parafusos M10',          descricao: 'Caixa 200 unidades' },
  { rua: 'A', posicao: '02', nivel: 2, nome: 'Porcas M10',             descricao: '' },
  { rua: 'A', posicao: '03', nivel: 1, nome: 'Chaves de Fenda',        descricao: 'Jogo 12 peças' },
  { rua: 'A', posicao: '04', nivel: 3, nome: 'Furadeira A150',         descricao: 'Modelo profissional' },
  { rua: 'A', posicao: '04', nivel: 2, nome: 'Brocas Inox',            descricao: 'Set 20 peças 2-12mm' },
  { rua: 'A', posicao: '05', nivel: 1, nome: 'Fita Isolante',          descricao: 'Rolo 20m preta' },
  { rua: 'A', posicao: '06', nivel: 3, nome: 'Resistores 100Ω',        descricao: 'Pacote 100 unidades' },
  { rua: 'A', posicao: '06', nivel: 2, nome: 'Capacitores 10uF',       descricao: 'Pacote 50 unidades' },
  { rua: 'A', posicao: '07', nivel: 1, nome: 'Multímetro Digital',     descricao: 'Range 0-600V' },
  { rua: 'A', posicao: '08', nivel: 3, nome: 'Tubo PVC 20mm',          descricao: 'Barra 3m' },
  { rua: 'A', posicao: '09', nivel: 2, nome: 'Luvas de Proteção',      descricao: 'Par tamanho M' },
  { rua: 'A', posicao: '10', nivel: 1, nome: 'Capacete de Segurança',  descricao: 'Classe A branco' },
  { rua: 'AF', posicao: '01', nivel: 1, nome: 'Cabo PP 2x2.5',         descricao: 'Rolo 50m' },
  { rua: 'AF', posicao: '03', nivel: 1, nome: 'Perfilado 40x40',       descricao: 'Barra 3m galvanizado' },
  { rua: 'AF', posicao: '05', nivel: 1, nome: 'Caixa de Passagem 4x4', descricao: 'PVC branca' },
  { rua: 'AF', posicao: '07', nivel: 1, nome: 'Abraçadeira Nylon 200mm', descricao: 'Pacote 100 unidades' },
  { rua: 'B',  posicao: '01', nivel: 3, nome: 'Disjuntor 63A',         descricao: 'Tripolar DIN' },
  { rua: 'B',  posicao: '01', nivel: 2, nome: 'Disjuntor 40A',         descricao: 'Bipolar DIN' },
  { rua: 'B',  posicao: '01', nivel: 1, nome: 'Disjuntor 20A',         descricao: 'Bipolar DIN' },
  { rua: 'B',  posicao: '02', nivel: 3, nome: 'Contator 32A',          descricao: 'CW32' },
  { rua: 'B',  posicao: '02', nivel: 2, nome: 'Relé Térmico',          descricao: '18-25A' },
  { rua: 'B',  posicao: '02', nivel: 1, nome: 'Tomada 20A 2P+T',       descricao: 'Embutir padrão BR' },
  { rua: 'B',  posicao: '03', nivel: 1, nome: 'Interruptor Simples',   descricao: '10A 250V branco' },
  { rua: 'B',  posicao: '04', nivel: 2, nome: 'Eletroduto Flexível',   descricao: '25mm 50m' },
  { rua: 'B',  posicao: '05', nivel: 1, nome: 'Cabo PP 2x1.5',         descricao: 'Rolo 100m' },
];

// ─── DB INIT ──────────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id        SERIAL PRIMARY KEY,
      rua       VARCHAR(5)   NOT NULL,
      posicao   VARCHAR(3)   NOT NULL,
      nivel     INTEGER      NOT NULL CHECK (nivel IN (1,2,3)),
      nome      VARCHAR(120) NOT NULL,
      descricao VARCHAR(400),
      foto_url  TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   VARCHAR(60) NOT NULL UNIQUE,
      password   VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migrations
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS foto_url TEXT`);

  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM items');
  if (parseInt(rows[0].c) === 0) {
    for (const s of seedData) {
      await pool.query(
        'INSERT INTO items (rua, posicao, nivel, nome, descricao) VALUES ($1,$2,$3,$4,$5)',
        [s.rua, s.posicao, s.nivel, s.nome, s.descricao || null]
      );
    }
    console.log(`Seed: ${seedData.length} itens inseridos.`);
  }
}

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

function requireMaster(req, res, next) {
  if (req.session && req.session.isMaster) return next();
  res.status(403).json({ error: 'Apenas o admin master pode gerenciar usuários' });
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { password, username } = req.body;

  // Login do admin master (sem username)
  if (!username && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.isMaster = true;
    req.session.username = 'Admin Master';
    return res.json({ ok: true, isMaster: true, username: 'Admin Master' });
  }

  // Login de usuário criado pelo admin
  if (username) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE LOWER(username)=LOWER($1)',
        [username]
      );
      if (rows.length && rows[0].password === password) {
        req.session.isAdmin = true;
        req.session.isMaster = false;
        req.session.username = rows[0].username;
        return res.json({ ok: true, isMaster: false, username: rows[0].username });
      }
    } catch (e) {
      console.error(e);
    }
  }

  res.status(401).json({ error: 'Usuário ou senha incorretos' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({
    isAdmin:  !!(req.session && req.session.isAdmin),
    isMaster: !!(req.session && req.session.isMaster),
    username: req.session?.username || null
  });
});

// ─── USER MANAGEMENT (master only) ───────────────────────────────────────────
app.get('/api/users', requireMaster, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', requireMaster, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  if (username.toLowerCase() === 'admin')
    return res.status(400).json({ error: 'Nome "admin" reservado' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1,$2) RETURNING id, username, created_at',
      [username.trim(), password]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Usuário já existe' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.delete('/api/users/:id', requireMaster, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// ─── UPLOAD FOTO ─────────────────────────────────────────────────────────────
app.post('/api/items/:id/foto', requireAdmin, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'shelf-control', resource_type: 'image', transformation: [{ width: 800, crop: 'limit', quality: 'auto' }] },
        (error, result) => error ? reject(error) : resolve(result)
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
    const { rows } = await pool.query(
      'UPDATE items SET foto_url=$1 WHERE id=$2 RETURNING *',
      [result.secure_url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error('Cloudinary error:', e);
    res.status(500).json({ error: 'Erro ao fazer upload da foto' });
  }
});

app.delete('/api/items/:id/foto', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE items SET foto_url=NULL WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Item não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao remover foto' });
  }
});

// ─── ITEM ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM items ORDER BY rua, posicao, nivel DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

app.post('/api/items', requireAdmin, async (req, res) => {
  const { rua, posicao, nivel, nome, descricao } = req.body;
  if (!rua || !posicao || !nivel || !nome)
    return res.status(400).json({ error: 'Campos obrigatórios: rua, posicao, nivel, nome' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO items (rua, posicao, nivel, nome, descricao) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [rua, posicao, nivel, nome, descricao || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

app.put('/api/items/:id', requireAdmin, async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      'UPDATE items SET nome=$1, descricao=$2 WHERE id=$3 RETURNING *',
      [nome, descricao || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

app.delete('/api/items/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM items WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Item não encontrado' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

initDB().then(() => {
  app.listen(port, () => console.log(`Shelf Control rodando na porta ${port}`));
}).catch(err => {
  console.error('Falha ao iniciar DB:', err);
  process.exit(1);
});
