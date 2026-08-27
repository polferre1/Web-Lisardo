import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { extractProduct } from './lib/extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data', 'menu.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.warn(
    '⚠️  ADMIN_TOKEN no está definido (revisa server/.env). El panel de admin no podrá autenticarse hasta que lo configures.'
  );
}

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use('/admin', express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  next();
}

async function readMenu() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeMenu(items) {
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

// Lectura pública: la web usa esto para pintar la carta.
app.get('/api/menu', async (_req, res) => {
  res.json(await readMenu());
});

// A partir de aquí, todo requiere el token de admin.
app.get('/api/admin/ping', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/extract', requireAdmin, async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Falta el campo "url".' });
  try {
    res.json(await extractProduct(url));
  } catch (err) {
    res.status(422).json({ error: err.message || 'No se pudo extraer la información del producto.' });
  }
});

app.post('/api/menu', requireAdmin, async (req, res) => {
  const { name, description, price, image, category, sourceUrl } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: "name" y "category".' });
  }
  const items = await readMenu();
  const item = {
    id: randomUUID(),
    name,
    description: description || '',
    price: price != null && price !== '' ? Number(price) : null,
    image: image || null,
    category,
    sourceUrl: sourceUrl || null,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  await writeMenu(items);
  res.status(201).json(item);
});

app.put('/api/menu/:id', requireAdmin, async (req, res) => {
  const items = await readMenu();
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado.' });
  const { name, description, price, image, category, sourceUrl } = req.body || {};
  items[idx] = {
    ...items[idx],
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: price === '' || price === null ? null : Number(price) }),
    ...(image !== undefined && { image }),
    ...(category !== undefined && { category }),
    ...(sourceUrl !== undefined && { sourceUrl }),
  };
  await writeMenu(items);
  res.json(items[idx]);
});

app.delete('/api/menu/:id', requireAdmin, async (req, res) => {
  const items = await readMenu();
  const next = items.filter((i) => i.id !== req.params.id);
  if (next.length === items.length) return res.status(404).json({ error: 'No encontrado.' });
  await writeMenu(next);
  res.status(204).end();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor de admin escuchando en http://localhost:${PORT}`);
  console.log(`Panel de admin en http://localhost:${PORT}/admin`);
});
