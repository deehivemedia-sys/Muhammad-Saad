import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// SQLite Database Setup
let db = new Database('accounting.sqlite');
console.log('Connected to better-sqlite3 database');

function initializeDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('customer', 'supplier')) NOT NULL
  )`);

  // Migration: Add head column to transactions if it doesn't exist
  const transInfo = db.prepare("PRAGMA table_info(transactions)").all() as any[];
  const hasHead = transInfo.some(col => col.name === 'head');
  const hasHeadId = transInfo.some(col => col.name === 'head_id');

  if (!hasHead) {
    db.exec(`ALTER TABLE transactions ADD COLUMN head TEXT`);
    // Migrate existing data if heads table exists
    try {
      db.exec(`
        UPDATE transactions 
        SET head = (SELECT name FROM heads WHERE heads.id = transactions.head_id)
        WHERE head_id IS NOT NULL
      `);
    } catch (e) {
      console.log("No heads table found for migration or already migrated");
    }
  }

  // Create new ledgers table if it still has head_id
  const ledgerInfo = db.prepare("PRAGMA table_info(ledgers)").all() as any[];
  const hasHeadIdInLedger = ledgerInfo.some(col => col.name === 'head_id');

  if (hasHeadIdInLedger) {
    // Recreate ledgers table without head_id
    db.exec(`CREATE TABLE ledgers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, name)
    )`);
    db.exec(`INSERT INTO ledgers_new (id, project_id, name) SELECT id, project_id, name FROM ledgers`);
    db.exec(`DROP TABLE ledgers`);
    db.exec(`ALTER TABLE ledgers_new RENAME TO ledgers`);
  } else {
    db.exec(`CREATE TABLE IF NOT EXISTS ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, name)
    )`);
  }

  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  // Migration: Seed default categories if table is empty
  const count = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
  if (count.count === 0) {
    const defaults = ['Material', 'Labor', 'Transport', 'Utilities', 'Fuel', 'Rent', 'Salary', 'Marketing', 'Repair & Maintenance', 'Taxes', 'Others'];
    const insert = db.prepare("INSERT INTO categories (name) VALUES (?)");
    defaults.forEach(cat => insert.run(cat));
  }

  // Recreate transactions table to clean up head_id and enforce schema
  if (hasHeadId) {
    db.exec(`CREATE TABLE transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      ledger_id INTEGER NOT NULL,
      head TEXT,
      party_id INTEGER,
      amount REAL NOT NULL CHECK(amount > 0),
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
    )`);
    db.exec(`
      INSERT INTO transactions_new (id, project_id, ledger_id, head, party_id, amount, type, date, note)
      SELECT id, project_id, ledger_id, head, party_id, amount, type, date, note FROM transactions
    `);
    db.exec(`DROP TABLE transactions`);
    db.exec(`ALTER TABLE transactions_new RENAME TO transactions`);
  } else {
    db.exec(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      ledger_id INTEGER NOT NULL,
      head TEXT,
      party_id INTEGER,
      amount REAL NOT NULL CHECK(amount > 0),
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
    )`);
  }

  // Indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_ledger ON transactions(ledger_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
  
  // Clean up legacy heads table if it's empty or no longer needed
  // db.exec(`DROP TABLE IF EXISTS heads`); 
}

initializeDatabase();

const upload = multer({ dest: 'uploads/' });

// API Routes

// Backup & Restore
app.get('/api/backup/export', (req, res) => {
  const dbPath = path.join(process.cwd(), 'accounting.sqlite');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, 'accounting_backup.sqlite');
  } else {
    res.status(404).json({ error: 'Database file not found' });
  }
});

app.post('/api/backup/import', upload.single('database'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const oldPath = req.file.path;
  const dbPath = path.join(process.cwd(), 'accounting.sqlite');

  try {
    // Close current connection
    db.close();

    // Replace file
    fs.copyFileSync(oldPath, dbPath);
    fs.unlinkSync(oldPath);

    // Reopen connection
    db = new Database('accounting.sqlite');
    console.log('Reconnected to restored better-sqlite3 database');

    res.json({ success: true, message: 'Database restored successfully. Please refresh the page.' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Categories (Heads)
app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  try {
    const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    res.json({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Projects
app.get('/api/projects', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM projects ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  try {
    const result = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
    res.json({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Heads
app.get('/api/heads', (req, res) => {
  const { project_id } = req.query;
  try {
    let sql = 'SELECT * FROM heads';
    const params = [];
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    sql += ' ORDER BY name';
    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/heads', (req, res) => {
  const { project_id, name } = req.body;
  try {
    const result = db.prepare('INSERT INTO heads (project_id, name) VALUES (?, ?)').run(project_id, name);
    res.json({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/heads/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM heads WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Ledgers
app.get('/api/ledgers', (req, res) => {
  const { project_id } = req.query;
  try {
    let sql = 'SELECT * FROM ledgers';
    const params = [];
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    sql += ' ORDER BY name';
    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/ledgers', (req, res) => {
  const { project_id, name } = req.body;
  try {
    const result = db.prepare('INSERT INTO ledgers (project_id, name) VALUES (?, ?)').run(project_id, name);
    res.json({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/ledgers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ledgers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Parties
app.get('/api/parties', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM parties ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/parties', (req, res) => {
  const { name, type } = req.body;
  try {
    const result = db.prepare('INSERT INTO parties (name, type) VALUES (?, ?)').run(name, type);
    res.json({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const { project_id, limit = 10 } = req.query;
  try {
    let sql = `
      SELECT t.*, p.name as party_name, l.name as ledger_name
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      JOIN ledgers l ON t.ledger_id = l.id
    `;
    const params = [];
    if (project_id) {
      sql += ' WHERE t.project_id = ?';
      params.push(project_id);
    }
    sql += ' ORDER BY t.date DESC, t.id DESC LIMIT ?';
    params.push(limit);
    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/transactions', (req, res) => {
  const { project_id, ledger_id, head, party_id, amount, type, date, note } = req.body;
  try {
    const result = db.prepare(
      'INSERT INTO transactions (project_id, ledger_id, head, party_id, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(project_id, ledger_id, head || null, party_id || null, amount, type, date, note);
    res.json({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Ledger Sheet (Statements)
app.get('/api/ledger-statement', (req, res) => {
  const { ledger_id, start_date, end_date, head } = req.query;
  if (!ledger_id) return res.status(400).json({ error: 'ledger_id is required' });

  try {
    let sql = `
      SELECT 
        t.date, 
        t.note, 
        t.head,
        p.name as party_name,
        CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END as debit,
        CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END as credit,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) OVER (ORDER BY t.date, t.id) as running_balance
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.ledger_id = ?
    `;
    const params: any[] = [ledger_id];

    if (start_date) {
      sql += ' AND t.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND t.date <= ?';
      params.push(end_date);
    }
    if (head) {
      sql += ' AND t.head = ?';
      params.push(head);
    }

    sql += ' ORDER BY t.date, t.id';
    
    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Reports
app.get('/api/reports/dashboard', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
    `).get();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/reports/project-wise', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        p.name as project_name,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expense
      FROM projects p
      LEFT JOIN transactions t ON p.id = t.project_id
      GROUP BY p.id
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/reports/ledger-wise', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        l.name as ledger_name,
        p.name as project_name,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expense
      FROM ledgers l
      JOIN projects p ON l.project_id = p.id
      LEFT JOIN transactions t ON l.id = t.ledger_id
      GROUP BY l.id
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/reports/head-wise', (req, res) => {
  const { project_id } = req.query;
  try {
    let sql = `
      SELECT 
        head as head_name,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
    `;
    const params = [];
    if (project_id) {
      sql += ' WHERE project_id = ?';
      params.push(project_id);
    }
    sql += ' GROUP BY head';
    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/reports/party-balances', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        p.name as party_name,
        p.type as party_type,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as balance
      FROM parties p
      LEFT JOIN transactions t ON p.id = t.party_id
      GROUP BY p.id
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
