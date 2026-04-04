// ══════════════════════════════════════════════════════
//  MM-INNOVATION TECH — Node.js / Express Backend
//  Install dependencies first:
//    npm install express mysql2 bcryptjs jsonwebtoken cors dotenv
//  Then run:
//    node server.js
// ══════════════════════════════════════════════════════

require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

// ── MIDDLEWARE ────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve your HTML files from /public

// ── DATABASE CONNECTION ───────────────────────────────
const db = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'mm_innovation',
  waitForConnections: true,
  connectionLimit: 10,
});

// Test connection on startup
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ MySQL connected successfully');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

// ── AUTH MIDDLEWARE ───────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );
    res.status(201).json({ message: 'Account created successfully', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, role: user.role } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me  (get current logged-in user)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// ══════════════════════════════════════════════════════
//  CONTACT ROUTES
// ══════════════════════════════════════════════════════

// POST /api/contact  (public — submit a message)
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: 'All fields are required' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email address' });
  try {
    await db.query('INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
    res.status(201).json({ message: 'Message sent successfully! We will get back to you soon.' });
  } catch {
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// GET /api/contact  (admin only — view all submissions)
app.get('/api/contact', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM contacts ORDER BY created_at DESC');
  res.json(rows);
});

// PATCH /api/contact/:id/read  (admin only — mark as read)
app.patch('/api/contact/:id/read', requireAdmin, async (req, res) => {
  await db.query("UPDATE contacts SET status = 'read' WHERE id = ?", [req.params.id]);
  res.json({ message: 'Marked as read' });
});

// DELETE /api/contact/:id  (admin only)
app.delete('/api/contact/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted successfully' });
});

// ══════════════════════════════════════════════════════
//  BLOG ROUTES
// ══════════════════════════════════════════════════════

// GET /api/blog  (public — get all published posts)
app.get('/api/blog', async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, title, tag, excerpt, image_url, author, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC'
  );
  res.json(rows);
});

// GET /api/blog/:id  (public — get single post)
app.get('/api/blog/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM blog_posts WHERE id = ? AND published = 1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Post not found' });
  res.json(rows[0]);
});

// POST /api/blog  (admin only — create post)
app.post('/api/blog', requireAdmin, async (req, res) => {
  const { title, tag, excerpt, content, image_url, author } = req.body;
  if (!title || !excerpt) return res.status(400).json({ error: 'Title and excerpt are required' });
  const [result] = await db.query(
    'INSERT INTO blog_posts (title, tag, excerpt, content, image_url, author) VALUES (?, ?, ?, ?, ?, ?)',
    [title, tag || '', excerpt, content || '', image_url || '', author || 'MM-IT Team']
  );
  res.status(201).json({ message: 'Post created', id: result.insertId });
});

// PUT /api/blog/:id  (admin only — update post)
app.put('/api/blog/:id', requireAdmin, async (req, res) => {
  const { title, tag, excerpt, content, image_url, author, published } = req.body;
  await db.query(
    'UPDATE blog_posts SET title=?, tag=?, excerpt=?, content=?, image_url=?, author=?, published=? WHERE id=?',
    [title, tag, excerpt, content, image_url, author, published ? 1 : 0, req.params.id]
  );
  res.json({ message: 'Post updated' });
});

// DELETE /api/blog/:id  (admin only)
app.delete('/api/blog/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Post deleted' });
});

// ══════════════════════════════════════════════════════
//  TESTIMONIAL ROUTES
// ══════════════════════════════════════════════════════

// GET /api/testimonials  (public — get approved ones)
app.get('/api/testimonials', async (req, res) => {
  const { type } = req.query; // ?type=client or ?type=intern
  let sql = 'SELECT * FROM testimonials WHERE approved = 1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// POST /api/testimonials  (public — submit a testimonial)
app.post('/api/testimonials', async (req, res) => {
  const { name, role, message, rating, type } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });
  await db.query(
    'INSERT INTO testimonials (name, role, message, rating, type) VALUES (?, ?, ?, ?, ?)',
    [name, role || '', message, rating || 5, type || 'client']
  );
  res.status(201).json({ message: 'Thank you! Your testimonial has been submitted for review.' });
});

// PATCH /api/testimonials/:id/approve  (admin only)
app.patch('/api/testimonials/:id/approve', requireAdmin, async (req, res) => {
  await db.query('UPDATE testimonials SET approved = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Testimonial approved' });
});

// DELETE /api/testimonials/:id  (admin only)
app.delete('/api/testimonials/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
  res.json({ message: 'Testimonial deleted' });
});

// ── START SERVER ──────────────────────────────────────
// ── PAGE ROUTES ───────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

app.get('/testimonials', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'testimonials.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.listen(PORT, () => {
  console.log(`🚀 MM-Innovation server running at http://localhost:${PORT}`);
});
