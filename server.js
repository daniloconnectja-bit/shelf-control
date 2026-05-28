const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());
// Serve static files from 'public' folder or root (fallback)
const staticDir = require('fs').existsSync(path.join(__dirname, 'public'))
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
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

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

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM items ORDER BY rua, posicao, nivel DESC');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

app.post('/api/items', async (req, res) => {
  const { rua, posicao, nivel, nome, descricao } = req.body;
  if (!rua || !posicao || !nivel || !nome) {
    return res.status(400).json({ error: 'Campos obrigatórios: rua, posicao, nivel, nome' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO items (rua, posicao, nivel, nome, descricao) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [rua, posicao, nivel, nome, descricao || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

app.put('/api/items/:id', async (req, res) => {
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
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM items WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Item não encontrado' });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(port, () => console.log(`Shelf Control rodando na porta ${port}`));
  })
  .catch(err => {
    console.error('Falha ao iniciar DB:', err);
    process.exit(1);
  });
