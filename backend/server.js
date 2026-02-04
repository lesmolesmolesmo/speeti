require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateInvoice, generateInvoiceNumber } = require('./invoice-generator');
const emailService = require('./email-service');
const sharp = require("sharp");
const crypto = require("crypto");
const rateLimit = require('express-rate-limit');

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 login/register attempts
  message: { error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute for sensitive endpoints
  message: { error: 'Rate limit erreicht. Bitte warte.' },
});
// Helper function to send order emails (Resend)
async function sendOrderEmails(orderId, status) {
  try {
    const order = db.prepare(`
      SELECT o.*, o.order_number, o.track_token, u.email, u.name as customer_name, 
             a.street, a.house_number, a.postal_code, a.city
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    `).get(orderId);
    
    if (!order || !order.email) {
      console.log('⚠️ No email for order', orderId);
      return;
    }
    
    const items = db.prepare(`
      SELECT oi.*, p.name, p.image FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(orderId);
    
    const orderData = {
      order_number: order.order_number || ('SPT-' + orderId),
      track_token: order.track_token,
      total: order.total,
      address: `${order.street} ${order.house_number}, ${order.postal_code} ${order.city}`
    };
    
    const customer = { email: order.email, name: order.customer_name };
    
    // Map internal statuses to email statuses
    const emailStatus = {
      'confirmed': 'confirmed',
      'picking': 'preparing',
      'picked': 'preparing', 
      'delivering': 'delivering',
      'delivered': 'delivered'
    };
    
    if (status === 'confirmed') {
      await emailService.sendOrderConfirmation(orderData, customer, items);
      console.log('📧 Order confirmation sent to:', order.email);
    } else if (emailStatus[status]) {
      await emailService.sendStatusUpdate(orderData, customer, emailStatus[status]);
      console.log('📧 Status update (' + status + ') sent to:', order.email);
    }
  } catch (e) {
    console.error('❌ Email error:', e.message);
  }
}

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Database setup
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'speeti.db'));

// Initialize database
db.exec(`
  -- Users (customers, drivers, admins)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'customer',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Addresses
  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT DEFAULT 'Zuhause',
    street TEXT NOT NULL,
    house_number TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT DEFAULT 'Münster',
    instructions TEXT,
    is_default INTEGER DEFAULT 0,
    lat REAL,
    lng REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Categories
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    image TEXT,
    color TEXT DEFAULT '#14B8A6',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  -- Products
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    original_price REAL,
    image TEXT,
    unit TEXT DEFAULT 'Stück',
    unit_amount TEXT DEFAULT '1',
    in_stock INTEGER DEFAULT 1,
    stock_count INTEGER DEFAULT 100,
    featured INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  -- Orders
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    address_id INTEGER NOT NULL,
    driver_id INTEGER,
    status TEXT DEFAULT 'pending',
    subtotal REAL NOT NULL,
    delivery_fee REAL DEFAULT 2.99,
    total REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'pending',
    stripe_session_id TEXT,
    notes TEXT,
    estimated_delivery TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    picked_at DATETIME,
    delivered_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (address_id) REFERENCES addresses(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  );

  -- Order Items
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    picked INTEGER DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Order Chat Messages (Driver <-> Customer)
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  -- Support Tickets (AI Chat + Escalation)
  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    status TEXT DEFAULT 'open',
    escalated INTEGER DEFAULT 0,
    escalation_reason TEXT,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  -- Support Chat Messages (AI + Human)
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL,
    sender_id INTEGER,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
  );

  -- Store Settings
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Invoices
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    net_total REAL NOT NULL,
    tax_7_amount REAL DEFAULT 0,
    tax_19_amount REAL DEFAULT 0,
    gross_total REAL NOT NULL,
    pdf_path TEXT,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  -- Business Settings (for invoices)
  CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT DEFAULT 'Speeti GmbH',
    street TEXT DEFAULT 'Musterstraße 1',
    postal_code TEXT DEFAULT '48149',
    city TEXT DEFAULT 'Münster',
    country TEXT DEFAULT 'Deutschland',
    phone TEXT DEFAULT '+49 251 12345678',
    email TEXT DEFAULT 'info@speeti.de',
    website TEXT DEFAULT 'www.speeti.de',
    tax_number TEXT,
    vat_id TEXT,
    registry TEXT,
    bank_name TEXT,
    iban TEXT,
    bic TEXT,
    logo_url TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Initialize business settings if empty
  INSERT OR IGNORE INTO business_settings (id) VALUES (1);

  -- Promo Codes
  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'percent',
    discount_value REAL NOT NULL,
    min_order_value REAL DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from DATETIME,
    valid_until DATETIME,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Promo Code Usage (track per user)
  CREATE TABLE IF NOT EXISTS promo_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promo_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    discount_amount REAL NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_id) REFERENCES promo_codes(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    UNIQUE(promo_id, user_id)
  );

  -- Ratings (Customer rates Driver)
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  );

  -- Push Subscriptions
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, endpoint)
  );

  -- Add sample promo codes
  INSERT OR IGNORE INTO promo_codes (code, description, discount_type, discount_value, min_order_value) 
  VALUES 
    ('WELCOME10', 'Willkommensrabatt 10%', 'percent', 10, 15),
    ('SPEETI5', '5€ Rabatt', 'fixed', 5, 20),
    ('FREEDELIVERY', 'Kostenlose Lieferung', 'delivery', 100, 10);

  -- Inventory Management (Warehouse)
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'Sonstiges',
    price REAL,
    image TEXT,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    source TEXT DEFAULT 'Manual',
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Inventory Transactions (for history/audit)
  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    type TEXT DEFAULT 'adjustment',
    reason TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Add new columns if they don't exist (for existing databases)
try {
  db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`);
} catch(e) {}
try {
  db.exec(`ALTER TABLE orders ADD COLUMN stripe_session_id TEXT`);
try { db.exec(`ALTER TABLE orders ADD COLUMN cancelled_at DATETIME`); } catch (e) {}
try { db.exec(`ALTER TABLE orders ADD COLUMN cancel_reason TEXT`); } catch (e) {}
} catch(e) {}

const JWT_SECRET = process.env.JWT_SECRET || 'speeti-secret-key-2024';

// Generate order details
function generateOrderDetails() {
  const crypto = require("crypto");
  // Get next order ID for sequential numbering
  const maxRow = db.prepare("SELECT MAX(id) as maxId FROM orders").get();
  const nextId = (maxRow?.maxId || 0) + 1;
  const orderNumber = "SPT-" + String(nextId).padStart(5, '0');
  const trackToken = crypto.randomBytes(16).toString("hex");
  return { orderNumber, trackToken };
}
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Middleware
app.use(cors({
  origin: ['https://speeti.de', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/api', generalLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend in production
// Static files with cache headers for SPA
app.use(express.static(path.join(__dirname, '../frontend/dist'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Auth middleware
const auth = (roles = []) => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Nicht autorisiert' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token ungültig' });
  }
};

// ============ AUTH ROUTES ============

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, name, phone } = req.body;
  
  // Password validation
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
  }
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)');
    const result = stmt.run(email, hash, name, phone || null);
    
    const token = jwt.sign({ id: result.lastInsertRowid, email, name, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastInsertRowid, email, name, role: 'customer' } });
  } catch (e) {
    res.status(400).json({ error: 'Email bereits registriert' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone } });
});

app.get('/api/auth/me', auth(), (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, role, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ============ PASSWORD RESET ============

// Request password reset
app.post('/api/auth/forgot-password', strictLimiter, async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail erforderlich' });
  }
  
  // Always return success (don't reveal if email exists)
  res.json({ success: true, message: 'Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen.' });
  
  try {
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return;
    
    // Generate reset token (valid 1 hour)
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour
    
    // Store token
    db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expires, user.id);
    
    // Send email
    const resetUrl = 'https://speeti.de/reset-password?token=' + token;
    await emailService.sendEmail(
      user.email,
      '🔐 Passwort zurücksetzen',
      emailService.emailTemplate(`
        <div style="text-align:center;padding:24px 0;">
          <div style="font-size:64px;margin-bottom:16px;">🔐</div>
          <h1 style="color:#1f2937;margin:0 0 8px 0;">Passwort zurücksetzen</h1>
          <p style="color:#6b7280;margin:0;">Du hast angefordert, dein Passwort zurückzusetzen.</p>
        </div>
        <p style="color:#374151;">Hallo <strong>${user.name || 'du'}</strong>!</p>
        <p style="color:#374151;">Klicke auf den Button um ein neues Passwort zu wählen:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${resetUrl}" class="button">Neues Passwort setzen</a>
        </div>
        <div class="info-box">
          <p style="margin:0;color:#6b7280;font-size:14px;">⏱️ Dieser Link ist <strong>1 Stunde</strong> gültig.</p>
          <p style="margin:8px 0 0 0;color:#6b7280;font-size:14px;">Falls du das nicht warst, ignoriere diese E-Mail einfach.</p>
        </div>
      `, 'Setze dein Passwort zurück')
    );
    console.log('📧 Password reset email sent to:', user.email);
  } catch (e) {
    console.error('Password reset error:', e);
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ error: 'Token und Passwort erforderlich' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
  }
  
  try {
    const user = db.prepare('SELECT id, email, reset_expires FROM users WHERE reset_token = ?').get(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Link' });
    }
    
    if (Date.now() > user.reset_expires) {
      return res.status(400).json({ error: 'Link ist abgelaufen. Bitte fordere einen neuen an.' });
    }
    
    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password and clear token
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hashedPassword, user.id);
    
    console.log('🔐 Password reset successful for:', user.email);
    res.json({ success: true, message: 'Passwort erfolgreich geändert! Du kannst dich jetzt einloggen.' });
  } catch (e) {
    console.error('Reset password error:', e);
    res.status(500).json({ error: 'Fehler beim Zurücksetzen' });
  }
});


// ============ CATEGORIES ============

app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order').all();
  res.json(categories);
});

app.post('/api/admin/categories', auth(['admin']), (req, res) => {
  const { name, slug, icon, image, color, sort_order } = req.body;
  const stmt = db.prepare('INSERT INTO categories (name, slug, icon, image, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(name, slug, icon || null, image || null, color || '#14B8A6', sort_order || 0);
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/admin/categories/:id', auth(['admin']), (req, res) => {
  const { name, slug, icon, image, color, sort_order, active } = req.body;
  db.prepare('UPDATE categories SET name=?, slug=?, icon=?, image=?, color=?, sort_order=?, active=? WHERE id=?')
    .run(name, slug, icon, image, color, sort_order, active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/categories/:id', auth(['admin']), (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ PRODUCTS ============

app.get('/api/products', (req, res) => {
  const { category, search, featured } = req.query;
  let sql = 'SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.in_stock = 1';
  const params = [];
  
  if (category) {
    sql += ' AND (c.slug = ? OR c.id = ?)';
    params.push(category, category);
  }
  if (search) {
    sql += ' AND p.name LIKE ?';
    params.push(`%${search}%`);
  }
  if (featured) {
    sql += ' AND p.featured = 1';
  }
  
  sql += ' ORDER BY p.created_at DESC, p.sort_order, p.id DESC';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden' });
  res.json(product);
});

app.post('/api/admin/products', auth(['admin']), (req, res) => {
  const fields = ['category_id', 'name', 'description', 'price', 'original_price', 'image', 'unit', 'unit_amount', 
    'stock_count', 'featured', 'ingredients', 'nutrition_calories', 'nutrition_fat', 'nutrition_carbs', 
    'nutrition_protein', 'nutrition_sugar', 'nutrition_salt', 'nutrition_fiber', 'allergens', 'origin', 
    'brand', 'ean', 'tax_rate', 'sku', 'weight', 'weight_unit', 'min_order', 'max_order', 'deposit', 
    'storage_temp', 'nutrition_info', 'visible', 'in_stock', 'sort_order'];
  
  const cols = fields.filter(f => req.body[f] !== undefined);
  const vals = cols.map(f => {
    const v = req.body[f];
    if (f === 'featured' || f === 'in_stock' || f === 'visible') return v ? 1 : 0;
    return v || null;
  });
  
  const sql = `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  const result = db.prepare(sql).run(...vals);
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/admin/products/:id', auth(['admin']), (req, res) => {
  const fields = ['category_id', 'name', 'description', 'price', 'original_price', 'image', 'unit', 'unit_amount', 
    'stock_count', 'featured', 'ingredients', 'nutrition_calories', 'nutrition_fat', 'nutrition_carbs', 
    'nutrition_protein', 'nutrition_sugar', 'nutrition_salt', 'nutrition_fiber', 'allergens', 'origin', 
    'brand', 'ean', 'tax_rate', 'sku', 'weight', 'weight_unit', 'min_order', 'max_order', 'deposit', 
    'storage_temp', 'nutrition_info', 'visible', 'in_stock', 'sort_order'];
  
  const updates = [];
  const vals = [];
  
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      const v = req.body[f];
      if (f === 'featured' || f === 'in_stock' || f === 'visible') {
        vals.push(v ? 1 : 0);
      } else {
        vals.push(v === '' ? null : v);
      }
    }
  });
  
  if (updates.length > 0) {
    vals.push(req.params.id);
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
  }
  res.json({ success: true });
});
app.delete('/api/admin/products/:id', auth(['admin']), (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ ADDRESSES ============

app.get('/api/addresses', auth(), (req, res) => {
  const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(req.user.id);
  res.json(addresses);
});

app.post('/api/addresses', auth(), (req, res) => {
  const { 
    label, street, house_number, postal_code, city, instructions, is_default, lat, lng,
    address_type, doorbell_name, entrance, floor, has_elevator 
  } = req.body;
  
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  
  const stmt = db.prepare(`
    INSERT INTO addresses (
      user_id, label, street, house_number, postal_code, city, instructions, is_default, lat, lng,
      address_type, doorbell_name, entrance, floor, has_elevator
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.user.id, 
    label || 'Zuhause', 
    street, 
    house_number, 
    postal_code, 
    city || 'Münster', 
    instructions || null, 
    is_default ? 1 : 0, 
    lat || null, 
    lng || null,
    address_type || 'wohnung',
    doorbell_name || null,
    entrance || null,
    floor || null,
    has_elevator ? 1 : 0
  );
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.delete('/api/addresses/:id', auth(), (req, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ============ ORDERS ============

app.get('/api/orders', auth(), (req, res) => {
  let sql, params;
  
  if (req.user.role === 'admin') {
    sql = `SELECT o.*, u.name as customer_name, u.phone as customer_phone, 
           a.street, a.house_number, a.postal_code, a.city, a.instructions,
           d.name as driver_name
           FROM orders o 
           JOIN users u ON o.user_id = u.id 
           JOIN addresses a ON o.address_id = a.id
           LEFT JOIN users d ON o.driver_id = d.id
           ORDER BY CASE o.status WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'picking' THEN 3 WHEN 'delivering' THEN 4 WHEN 'delivered' THEN 5 WHEN 'cancelled' THEN 6 END, o.created_at DESC`;
    params = [];
  } else if (req.user.role === 'driver') {
    sql = `SELECT o.*, u.name as customer_name, u.phone as customer_phone,
           a.street, a.house_number, a.postal_code, a.city, a.instructions
           FROM orders o 
           JOIN users u ON o.user_id = u.id 
           JOIN addresses a ON o.address_id = a.id
           WHERE o.driver_id = ? 
              OR (o.driver_id IS NULL AND o.status = 'confirmed')
           ORDER BY 
             CASE WHEN o.driver_id IS NULL AND o.status = 'confirmed' THEN 0 ELSE 1 END,
             o.created_at DESC`;
    params = [req.user.id];
  } else {
    sql = `SELECT o.*, a.street, a.house_number, a.postal_code, a.city,
           d.name as driver_name, d.phone as driver_phone
           FROM orders o JOIN addresses a ON o.address_id = a.id
           LEFT JOIN users d ON o.driver_id = d.id
           WHERE o.user_id = ? ORDER BY CASE o.status WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'picking' THEN 3 WHEN 'delivering' THEN 4 WHEN 'delivered' THEN 5 WHEN 'cancelled' THEN 6 END, o.created_at DESC`;
    params = [req.user.id];
  }
  
  const orders = db.prepare(sql).all(...params);
  
  orders.forEach(order => {
    order.items = db.prepare(`
      SELECT oi.*, p.name, p.image, p.unit 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `).all(order.id);
  });
  
  res.json(orders);
});

app.get('/api/orders/:id', auth(), (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as customer_name, u.phone as customer_phone,
           a.street, a.house_number, a.postal_code, a.city, a.instructions,
           d.name as driver_name, d.phone as driver_phone
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    JOIN addresses a ON o.address_id = a.id
    LEFT JOIN users d ON o.driver_id = d.id
    WHERE o.id = ?
  `).get(req.params.id);
  
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden' });
  
  order.items = db.prepare(`
    SELECT oi.*, p.name, p.image, p.unit 
    FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    WHERE oi.order_id = ?
  `).all(order.id);
  
  order.messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.order_id = ? ORDER BY m.created_at
  `).all(order.id);
  
  // Include invoice if exists
  order.invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);
  
  res.json(order);
});

app.post("/api/orders", auth(), (req, res) => {
  console.log("📦 Order request:", JSON.stringify(req.body));
  try {
  const { address_id, items, payment_method, notes, scheduled_time } = req.body;
  
  let subtotal = 0;
  const productIds = items.map(i => i.product_id);
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`).all(...productIds);
  
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) subtotal += product.price * item.quantity;
  });
  
  const delivery_fee = 2.99;
  const total = subtotal + delivery_fee;
  const estimated = scheduled_time ? scheduled_time : new Date(Date.now() + 20 * 60000).toISOString();
  
  const { orderNumber, trackToken } = generateOrderDetails();
  const orderStmt = db.prepare(`INSERT INTO orders (user_id, address_id, order_number, track_token, status, subtotal, delivery_fee, total, payment_method, notes, estimated_delivery, scheduled_time) VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)`);
  const orderResult = orderStmt.run(req.user.id, address_id, orderNumber, trackToken, subtotal, delivery_fee, total, payment_method || 'cash', notes || null, estimated, scheduled_time || null);
  const orderId = orderResult.lastInsertRowid;
  
  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) itemStmt.run(orderId, item.product_id, item.quantity, product.price);
  });
  
  io.emit('new-order', { orderId });
  sendOrderEmails(orderId, 'confirmed');
  
  res.json({ id: orderId, total, estimated_delivery: estimated });
  } catch (e) {
    console.error("Order error:", e);
    res.status(500).json({ error: "Fehler bei der Bestellung", details: e.message });
  }
});

app.patch('/api/orders/:id/status', auth(['admin', 'driver']), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'picking', 'picked', 'delivering', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }
  
  let update = 'UPDATE orders SET status = ?';
  const params = [status];
  
  if (status === 'picking' || status === 'picked') {
    update += ', driver_id = ?';
    params.push(req.user.id);
  }
  if (status === 'picked') {
    update += ', picked_at = CURRENT_TIMESTAMP';
  }
  if (status === 'delivered') {
    update += ', delivered_at = CURRENT_TIMESTAMP';
  }
  
  update += ' WHERE id = ?';
  params.push(req.params.id);
  
  db.prepare(update).run(...params);
  
  io.emit('order-update', { orderId: parseInt(req.params.id), status });
  sendOrderEmails(parseInt(req.params.id), status);
  
  // Auto-generate invoice when delivered
  if (status === 'delivered') {
    autoGenerateInvoice(parseInt(req.params.id)).catch(console.error);
  }
  
  res.json({ success: true });
});

app.patch('/api/orders/:id/items/:itemId/pick', auth(['driver']), (req, res) => {
  db.prepare('UPDATE order_items SET picked = 1 WHERE id = ? AND order_id = ?').run(req.params.itemId, req.params.id);
  io.emit('item-picked', { orderId: parseInt(req.params.id), itemId: parseInt(req.params.itemId) });
  res.json({ success: true });
});


// ============ ORDER CANCELLATION ============

// Customer can cancel before picking starts
app.post('/api/orders/:orderNumber/cancel', (req, res) => {
  const { token, email, reason } = req.body;
  const orderNumber = req.params.orderNumber;
  
  try {
    // Find order
    const order = db.prepare(`
      SELECT o.id, o.order_number, o.track_token, o.status, o.total,
             u.email as customer_email, u.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.order_number = ? OR o.id = ?
    `).get(orderNumber, orderNumber);
    
    if (!order) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    }
    
    // Verify authorization (token OR email)
    const isValidToken = token && order.track_token && token === order.track_token;
    const isValidEmail = email && order.customer_email && 
                         email.toLowerCase() === order.customer_email.toLowerCase();
    
    if (!isValidToken && !isValidEmail) {
      return res.status(403).json({ error: 'Nicht autorisiert' });
    }
    
    // Check if cancellation is still allowed
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      // Provide status-specific message
      let statusMessage = 'Deine Bestellung wird bereits bearbeitet.';
      if (order.status === 'picking' || order.status === 'picked') {
        statusMessage = 'Deine Bestellung wird gerade von unserem Team zusammengestellt.';
      } else if (order.status === 'delivering') {
        statusMessage = 'Dein Fahrer ist bereits unterwegs zu dir!';
      }
      
      return res.status(400).json({ 
        error: 'Online-Stornierung nicht mehr möglich',
        message: statusMessage,
        supportNeeded: true,
        currentStatus: order.status
      });
    }
    
    // Cancel the order
    db.prepare(`
      UPDATE orders SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?
      WHERE id = ?
    `).run(reason || 'Vom Kunden storniert', order.id);
    
    // Notify via Socket.io
    io.emit('order-cancelled', { orderId: order.id, orderNumber: order.order_number });
    
    // Send confirmation email
    if (order.customer_email && emailService) {
      const content = `
        <div style="text-align:center;padding:24px 0;">
          <div style="font-size:64px;margin-bottom:16px;">❌</div>
          <h1 style="color:#1f2937;margin:0 0 8px 0;">Bestellung storniert</h1>
          <p style="color:#6b7280;margin:0;">Deine Bestellung ${order.order_number || 'SPEETI-' + String(order.id).padStart(5, '0')} wurde erfolgreich storniert.</p>
        </div>
        <div class="info-box">
          <p style="margin:0;color:#6b7280;">
            Falls du per Karte bezahlt hast, wird der Betrag von <strong>${order.total?.toFixed(2)} €</strong> 
            innerhalb von 5-10 Werktagen zurückerstattet.
          </p>
        </div>
        <div style="text-align:center;margin-top:24px;">
          <p style="color:#1f2937;margin-bottom:16px;">Wir hoffen, dich bald wieder zu sehen! 💕</p>
          <a href="https://speeti.de" class="button">Weiter shoppen</a>
        </div>
      `;
      emailService.sendEmail(
        order.customer_email, 
        'Bestellung storniert ❌', 
        emailService.emailTemplate(content, 'Deine Bestellung wurde storniert')
      );
    }
    
    console.log('📦 Order cancelled:', order.order_number, 'by customer');
    
    res.json({ 
      success: true, 
      message: 'Bestellung erfolgreich storniert',
      refundInfo: 'Falls du per Karte bezahlt hast, wird der Betrag in 5-10 Werktagen zurückerstattet.'
    });
    
  } catch (e) {
    console.error('Cancel error:', e);
    res.status(500).json({ error: 'Fehler beim Stornieren' });
  }
});

// ============ ORDER CHAT (Driver <-> Customer) ============

app.post('/api/orders/:id/messages', auth(), (req, res) => {
  console.log("📦 Order request:", JSON.stringify(req.body));
  const { message } = req.body;
  const stmt = db.prepare('INSERT INTO messages (order_id, sender_id, message) VALUES (?, ?, ?)');
  const result = stmt.run(req.params.id, req.user.id, message);
  
  const user = db.prepare('SELECT name, role FROM users WHERE id = ?').get(req.user.id);
  
  const msg = {
    id: result.lastInsertRowid,
    order_id: parseInt(req.params.id),
    sender_id: req.user.id,
    sender_name: user?.name || 'User',
    sender_role: user?.role || 'customer',
    message,
    created_at: new Date().toISOString()
  };
  
  io.to(`order-${req.params.id}`).emit('new-message', msg);
  res.json(msg);
});

app.get('/api/orders/:id/messages', auth(), (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.order_id = ? ORDER BY m.created_at
  `).all(req.params.id);
  res.json(messages);
});

// ============ SUPPORT CHAT (AI + Escalation) ============

// AI System prompt for customer support
const SUPPORT_SYSTEM_PROMPT = `Du bist der freundliche KI-Kundenservice-Assistent von Speeti, einem blitzschnellen Lebensmittel-Lieferdienst in Münster (ähnlich wie Flink/Gorillas).

DEINE PERSÖNLICHKEIT:
- Freundlich, hilfsbereit und lösungsorientiert
- Benutze Emojis sparsam aber passend
- Antworte prägnant (2-3 Sätze max)
- Sei proaktiv und biete Lösungen an

UNSER SERVICE - DIESE INFOS KANNST DU IMMER GEBEN:
📍 Liefergebiet: Ganz Münster (alle PLZ mit 48...)
⏱️ Lieferzeit: Ca. 15-20 Minuten
💰 Liefergebühr: 2,99€ (ab 20€ Bestellwert GRATIS!)
🕐 Öffnungszeiten: Täglich 08:00 - 22:00 Uhr
📦 Mindestbestellwert: Keiner!
💳 Zahlungsmethoden: Kreditkarte, Barzahlung
🏷️ Promo-Code für Neukunden: WELCOME10 (10% Rabatt)

HÄUFIGE FRAGEN - BEANTWORTE DIESE IMMER:

1. Wo liefert ihr? / Liefert ihr nach...?
   → Wir liefern in ganz Münster! Alle Postleitzahlen die mit 48 beginnen. Leider noch nicht außerhalb von Münster.

2. Wie lange dauert die Lieferung?
   → In der Regel 15-20 Minuten nach Bestellung!

3. Wie kann ich bezahlen?
   → Kreditkarte direkt in der App oder Barzahlung an der Tür. Alles easy!

4. Kann ich stornieren?
   → Ja, solange die Bestellung noch nicht unterwegs ist. Geh zu Meine Bestellungen und tippe auf Stornieren.

5. Meine Bestellung ist falsch/beschädigt
   → Das tut mir sehr leid! Mach bitte ein Foto und schick es mir. Wir erstatten oder liefern neu - kein Problem!

6. Wie bekomme ich eine Rückerstattung?
   → Bei Problemen mit der Bestellung einfach hier melden. Wir kümmern uns darum und erstatten innerhalb von 24h.

7. Gibt es Rabatte?
   → Neukunden bekommen 10% mit WELCOME10. Wir haben auch regelmäßig Angebote in der App!

8. Wann habt ihr geöffnet?
   → Täglich von 8:00 bis 22:00 Uhr. Außerhalb der Zeiten kannst du Vorbestellungen für den nächsten Tag machen!

9. Kann ich Sonderwünsche angeben?
   → Ja! Im Checkout gibt es ein Notizfeld. Z.B. Bitte klingeln oder Vor der Tür abstellen.

10. Wie verfolge ich meine Bestellung?
    → In der App unter Meine Bestellungen siehst du den Live-Status und wo dein Fahrer gerade ist!

BESTELLUNGSPROBLEME:
- Verspätung: Entschuldige dich, erkläre dass es manchmal länger dauern kann, biete Info zum Tracking an
- Falscher Artikel: Entschuldige dich, bitte um Foto, biete Erstattung oder Nachlieferung an
- Beschädigt: Entschuldige dich, bitte um Foto, erstattest sofort
- Fahrer nicht erreichbar: Versuche den Fahrer über die App zu kontaktieren, sonst hilf mit Alternative

ESKALIERE ZU EINEM MENSCHEN (antworte mit [ESKALATION]) NUR BEI:
- Kunde verwendet wiederholt Schimpfwörter oder ist sehr aggressiv
- Rückerstattung über 50€
- Rechtliche Drohungen
- Account-Sicherheitsprobleme
- Kunde fragt EXPLIZIT nach einem Menschen/Mitarbeiter
- Du weißt die Antwort wirklich nicht

WICHTIG: Versuche IMMER erst selbst zu helfen bevor du eskalierst!
Antworte IMMER auf Deutsch.
`;

// Get or create support ticket
app.post('/api/support/ticket', auth(), async (req, res) => {
  const { order_id } = req.body;
  
  // Check for existing open ticket
  let ticket = db.prepare(`
    SELECT * FROM support_tickets 
    WHERE user_id = ? AND status = 'open' 
    ORDER BY created_at DESC LIMIT 1
  `).get(req.user.id);
  
  if (!ticket) {
    const stmt = db.prepare('INSERT INTO support_tickets (user_id, order_id) VALUES (?, ?)');
    const result = stmt.run(req.user.id, order_id || null);
    ticket = { id: result.lastInsertRowid, user_id: req.user.id, order_id, status: 'open', escalated: 0 };
    
    // Send welcome message
    const welcomeMsg = order_id 
      ? `Hallo! 👋 Ich sehe, du hast eine Frage zu Bestellung #${order_id}. Wie kann ich dir helfen?`
      : 'Hallo! 👋 Willkommen beim Speeti Support. Wie kann ich dir heute helfen?';
    
    db.prepare('INSERT INTO support_messages (ticket_id, sender_type, message) VALUES (?, ?, ?)')
      .run(ticket.id, 'ai', welcomeMsg);
  }
  
  // Get messages
  const messages = db.prepare(`
    SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at
  `).all(ticket.id);
  
  res.json({ 
    ticket: {
      ...ticket,
      humanTakeover: !!ticket.human_takeover
    }, 
    messages 
  });
});

// Send message to support (AI responds)
app.post('/api/support/message', auth(), async (req, res) => {
  const { ticket_id, message } = req.body;
  
  // Verify ticket belongs to user
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?').get(ticket_id, req.user.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket nicht gefunden' });
  
  // Save user message
  db.prepare('INSERT INTO support_messages (ticket_id, sender_type, sender_id, message) VALUES (?, ?, ?, ?)')
    .run(ticket_id, 'user', req.user.id, message);
  
  // If human has taken over OR escalated, don't use AI - notify admin instead
  if (ticket.human_takeover || ticket.escalated) {
    io.emit('support-message', { ticket_id, sender: 'user', message, userName: req.user.name });
    
    const waitingMsg = ticket.human_takeover 
      ? '👋 Ein Mitarbeiter wird dir gleich antworten. Bitte hab einen Moment Geduld!'
      : 'Deine Nachricht wurde an unser Support-Team weitergeleitet. Wir melden uns schnellstmöglich bei dir.';
    
    return res.json({ 
      response: waitingMsg,
      escalated: true,
      humanTakeover: !!ticket.human_takeover
    });
  }
  
  // Get conversation history
  const history = db.prepare('SELECT sender_type, message FROM support_messages WHERE ticket_id = ? ORDER BY created_at').all(ticket_id);
  
  // Get order context if available
  let orderContext = '';
  if (ticket.order_id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(ticket.order_id);
    if (order) {
      orderContext = `\n\nKONTEXT - Bestellung #${order.id}:
- Status: ${order.status}
- Gesamtbetrag: ${order.total}€
- Erstellt: ${order.created_at}
- Lieferadresse bekannt`;
    }
  }
  
  // Call OpenAI API
  let aiResponse = '';
  let shouldEscalate = false;
  
  if (OPENAI_API_KEY) {
    try {
      const openaiMessages = [
        { role: 'system', content: SUPPORT_SYSTEM_PROMPT + orderContext },
        ...history.map(m => ({
          role: m.sender_type === 'user' ? 'user' : 'assistant',
          content: m.message
        }))
      ];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openaiMessages,
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content || '';
      
      // Check for escalation trigger
      if (aiResponse.includes('[ESKALATION]')) {
        shouldEscalate = true;
        aiResponse = 'Ich verstehe, dass du mit einem echten Mitarbeiter sprechen möchtest. Ich leite dich jetzt an unser Support-Team weiter. Jemand wird sich in Kürze bei dir melden. 🙋‍♂️';
      }
    } catch (e) {
      console.error('OpenAI error:', e);
      aiResponse = 'Entschuldigung, ich habe gerade technische Schwierigkeiten. Bitte versuche es in ein paar Minuten erneut oder kontaktiere uns unter support@speeti.de';
    }
  } else {
    // Fallback without OpenAI - comprehensive keyword matching
    const lowerMsg = message.toLowerCase();
    
    // Escalation triggers
    if (lowerMsg.includes('mensch') || lowerMsg.includes('mitarbeiter') || lowerMsg.includes('echter support')) {
      shouldEscalate = true;
      aiResponse = 'Ich leite dich an einen Mitarbeiter weiter. Bitte warte einen Moment. 🙋♂️';
    }
    // Lieferzeit
    else if (lowerMsg.includes('lieferzeit') || lowerMsg.includes('wie lange') || lowerMsg.includes('wann kommt')) {
      aiResponse = 'Die Lieferung dauert normalerweise 15-20 Minuten! 🚴 Du kannst den Live-Status in "Meine Bestellungen" verfolgen.';
    }
    // Stornierung
    else if (lowerMsg.includes('stornieren') || lowerMsg.includes('abbrechen') || lowerMsg.includes('storno')) {
      aiResponse = 'Kein Problem! Geh zu "Meine Bestellungen" und tippe auf Stornieren. Falls die Bestellung schon unterwegs ist, kontaktiere deinen Fahrer direkt über den Chat.';
    }
    // Bezahlung
    else if (lowerMsg.includes('bezahl') || lowerMsg.includes('zahlung') || lowerMsg.includes('kreditkarte') || lowerMsg.includes('bar')) {
      aiResponse = 'Du kannst mit Kreditkarte in der App oder bar an der Tür bezahlen! 💳 Beides kein Problem.';
    }
    // Liefergebiet
    else if (lowerMsg.includes('liefert ihr') || lowerMsg.includes('liefergebiet') || lowerMsg.includes('wo liefert')) {
      aiResponse = 'Wir liefern in ganz Münster! 📍 Alle Postleitzahlen die mit 48 beginnen. Außerhalb leider noch nicht.';
    }
    // Öffnungszeiten
    else if (lowerMsg.includes('öffnungszeit') || lowerMsg.includes('geöffnet') || lowerMsg.includes('geschlossen') || lowerMsg.includes('wann auf')) {
      aiResponse = 'Wir sind täglich von 08:00 bis 22:00 Uhr für dich da! 🕐 Außerhalb kannst du Vorbestellungen machen.';
    }
    // Rabatt/Promo
    else if (lowerMsg.includes('rabatt') || lowerMsg.includes('promo') || lowerMsg.includes('gutschein') || lowerMsg.includes('code')) {
      aiResponse = 'Als Neukunde bekommst du 10% Rabatt mit dem Code WELCOME10! 🎉 Weitere Angebote findest du in der App.';
    }
    // Liefergebühr
    else if (lowerMsg.includes('liefergebühr') || lowerMsg.includes('versand') || lowerMsg.includes('kosten')) {
      aiResponse = 'Die Liefergebühr beträgt 2,99€ - aber ab 20€ Bestellwert ist sie GRATIS! 🎁';
    }
    // Problem/Beschwerde
    else if (lowerMsg.includes('problem') || lowerMsg.includes('beschwerde') || lowerMsg.includes('falsch') || lowerMsg.includes('fehlt')) {
      aiResponse = 'Das tut mir leid! 😔 Beschreib mir bitte genau was passiert ist - bei Problemen mit deiner Bestellung finden wir eine Lösung!';
    }
    // Rückerstattung
    else if (lowerMsg.includes('erstattung') || lowerMsg.includes('geld zurück') || lowerMsg.includes('refund')) {
      aiResponse = 'Bei berechtigten Problemen erstatten wir natürlich! Beschreib mir was passiert ist und wir kümmern uns darum. 💪';
    }
    // Tracking
    else if (lowerMsg.includes('track') || lowerMsg.includes('verfolg') || lowerMsg.includes('wo ist')) {
      aiResponse = 'Du kannst deine Bestellung live verfolgen! Geh zu "Meine Bestellungen" - dort siehst du genau wo dein Fahrer ist. 📱';
    }
    // Danke
    else if (lowerMsg.includes('danke') || lowerMsg.includes('super') || lowerMsg.includes('toll')) {
      aiResponse = 'Gerne! 😊 Gibt es noch etwas womit ich dir helfen kann?';
    }
    // Hallo/Begrüßung
    else if (lowerMsg.includes('hallo') || lowerMsg.includes('hi') || lowerMsg.includes('hey') || lowerMsg.includes('guten')) {
      aiResponse = 'Hey! 👋 Schön dass du da bist. Wie kann ich dir helfen?';
    }
    // Default
    else {
      aiResponse = 'Ich bin Speeti\'s KI-Assistent! 🤖 Ich kann dir helfen mit: Bestellungen, Lieferzeiten, Bezahlung, Stornierung und mehr. Was möchtest du wissen?';
    }
  }

  
  // Save AI response
  db.prepare('INSERT INTO support_messages (ticket_id, sender_type, message) VALUES (?, ?, ?)')
    .run(ticket_id, 'ai', aiResponse);
  
  // Handle escalation
  if (shouldEscalate) {
    db.prepare('UPDATE support_tickets SET escalated = 1, escalation_reason = ? WHERE id = ?')
      .run('User requested or AI triggered', ticket_id);
    
    io.emit('support-escalation', { ticket_id, user_id: req.user.id });
  }
  
  res.json({ response: aiResponse, escalated: shouldEscalate });
});

// Get all support tickets (admin) - includes closed tickets filter
app.get('/api/admin/support', auth(['admin']), (req, res) => {
  const { includeClosed } = req.query;
  
  let whereClause = '';
  
  const tickets = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email,
           (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id AND sender_type = 'user') as message_count,
           (SELECT message FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    ${whereClause}
    ORDER BY t.escalated DESC, t.created_at DESC
  `).all();
  res.json(tickets);
});

// Get ticket messages (admin)
app.get('/api/admin/support/:id', auth(['admin']), (req, res) => {
  const ticket = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);
  
  if (!ticket) return res.status(404).json({ error: 'Ticket nicht gefunden' });
  
  const messages = db.prepare('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at').all(req.params.id);
  
  res.json({ ticket, messages });
});

// Admin reply to ticket
app.post('/api/admin/support/:id/reply', auth(['admin']), (req, res) => {
  const { message } = req.body;
  
  db.prepare('INSERT INTO support_messages (ticket_id, sender_type, sender_id, message) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'admin', req.user.id, message);
  
  io.emit('support-message', { ticket_id: parseInt(req.params.id), sender: 'admin', message });
  
  res.json({ success: true });
});

// Close ticket
app.post('/api/admin/support/:id/close', auth(['admin']), (req, res) => {
  db.prepare('UPDATE support_tickets SET status = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('closed', req.params.id);
  res.json({ success: true });
});

// Admin: Toggle human takeover for a ticket
app.post("/api/admin/support/:id/takeover", auth(["admin"]), (req, res) => {
  const { takeover } = req.body;
  const ticketId = req.params.id;
  
  try {
    db.prepare("UPDATE support_tickets SET human_takeover = ? WHERE id = ?")
      .run(takeover ? 1 : 0, ticketId);
    
    const ticket = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket nicht gefunden" });
    }
    
    res.json({ 
      success: true, 
      human_takeover: !!ticket.human_takeover,
      message: takeover ? "Du hast das Ticket übernommen" : "KI antwortet wieder"
    });
  } catch (e) {
    console.error("Takeover error:", e);
    res.status(500).json({ error: "Fehler beim Übernehmen" });
  }
});

// ============ STRIPE PAYMENTS ============

// Create checkout session
app.post('/api/checkout/create-session', auth(), async (req, res) => {
  console.log("💳 Stripe checkout request:", JSON.stringify(req.body));
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  }
  
  const { address_id, items, notes, scheduled_time } = req.body;
  
  // Calculate totals
  let subtotal = 0;
  const productIds = items.map(i => i.product_id);
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`).all(...productIds);
  
  const lineItems = [];
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      subtotal += product.price * item.quantity;
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name,
            images: product.image && product.image.startsWith('http') ? [product.image] : []
          },
          unit_amount: Math.round(product.price * 100)
        },
        quantity: item.quantity
      });
    }
  });
  
  // Add delivery fee
  lineItems.push({
    price_data: {
      currency: 'eur',
      product_data: { name: 'Liefergebühr' },
      unit_amount: 299
    },
    quantity: 1
  });
  
  const total = subtotal + 2.99;
  
  // Create pending order with optional scheduled time
  const estimated = scheduled_time ? scheduled_time : new Date(Date.now() + 20 * 60000).toISOString();
  const { orderNumber: stripeOrderNum, trackToken: stripeTrackToken } = generateOrderDetails();
  const orderStmt = db.prepare(`INSERT INTO orders (user_id, address_id, order_number, track_token, status, subtotal, delivery_fee, total, payment_method, payment_status, notes, estimated_delivery, scheduled_time) VALUES (?, ?, ?, ?, 'pending', ?, 2.99, ?, 'stripe', 'pending', ?, ?, ?)`);
  const orderResult = orderStmt.run(req.user.id, address_id, stripeOrderNum, stripeTrackToken, subtotal, total, notes || null, estimated, scheduled_time || null);
  const orderId = orderResult.lastInsertRowid;
  
  // Insert items
  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) itemStmt.run(orderId, item.product_id, item.quantity, product.price);
  });
  
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `https://speeti.de/orders/${orderId}?success=true`,
      cancel_url: `https://speeti.de/checkout?cancelled=true`,
      metadata: { order_id: orderId.toString() },
      payment_intent_data: {
        metadata: { order_id: orderId.toString() }
      },
      locale: 'de'
    });
    
    // Save session ID
    db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId);
    
    res.json({ sessionId: session.id, url: session.url, orderId });
  } catch (e) {
    console.error('Stripe error:', e);
    // Delete pending order on failure
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    res.status(500).json({ error: 'Checkout-Fehler: ' + e.message });
  }
});

// Stripe webhook
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!STRIPE_SECRET_KEY) return res.status(400).send('Stripe nicht konfiguriert');
  
  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    
    if (orderId) {
      db.prepare('UPDATE orders SET status = ?, payment_status = ? WHERE id = ?')
        .run('confirmed', 'paid', orderId);
      
      io.emit('new-order', { orderId: parseInt(orderId) });
  sendOrderEmails(orderId, 'confirmed');
    }
  }
  
  res.json({ received: true });
});

// ============ ADMIN: USERS/DRIVERS ============

app.get('/api/admin/users', auth(['admin']), (req, res) => {
  const users = db.prepare('SELECT id, email, name, phone, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

app.post('/api/admin/drivers', auth(['admin']), async (req, res) => {
  const { email, password, name, phone } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(email, hash, name, phone, 'driver');
  res.json({ id: result.lastInsertRowid, email, name, phone, role: 'driver' });
});

app.patch('/api/admin/users/:id/role', auth(['admin']), (req, res) => {
  const { role } = req.body;
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ success: true });
});

// ============ ADMIN: STATS ============

app.get('/api/admin/stats', auth(['admin']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    orders_today: db.prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at) = ?").get(today).count,
    revenue_today: db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = ? AND status = 'delivered'").get(today).total,
    pending_orders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed', 'picking')").get().count,
    total_customers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count,
    total_products: db.prepare("SELECT COUNT(*) as count FROM products").get().count,
    total_drivers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver'").get().count,
    open_tickets: db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'").get().count,
    escalated_tickets: db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE escalated = 1 AND status = 'open'").get().count
  };
  
  res.json(stats);
});

// ============ SETTINGS ============

app.get('/api/settings', (req, res) => {
  const settings = {};
  db.prepare('SELECT * FROM settings').all().forEach(s => settings[s.key] = s.value);
  res.json(settings);
});

app.put('/api/admin/settings', auth(['admin']), (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  Object.entries(req.body).forEach(([key, value]) => {
    stmt.run(key, String(value));
  });
  res.json({ success: true });
});

// ============ INVOICES ============

// Get business settings
app.get('/api/admin/business', auth(['admin']), (req, res) => {
  const business = db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
  res.json(business || {});
});

// Update business settings
app.put('/api/admin/business', auth(['admin']), (req, res) => {
  const fields = ['company_name', 'street', 'postal_code', 'city', 'country', 'phone', 'email', 
                  'website', 'tax_number', 'vat_id', 'registry', 'bank_name', 'iban', 'bic', 'logo_url'];
  
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (updates.length === 0) return res.json({ success: true });
  
  const sql = `UPDATE business_settings SET ${updates.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`;
  db.prepare(sql).run(...updates.map(f => req.body[f]));
  
  res.json({ success: true });
});

// Generate invoice for an order
app.post('/api/orders/:id/invoice', auth(), async (req, res) => {
  console.log("📦 Order request:", JSON.stringify(req.body));
  const orderId = parseInt(req.params.id);
  
  // Check if invoice already exists
  const existingInvoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);
  if (existingInvoice) {
    return res.json({ invoice: existingInvoice, message: 'Rechnung existiert bereits' });
  }
  
  // Get order with details
  const order = db.prepare(`
    SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
           a.street, a.house_number, a.postal_code, a.city
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    JOIN addresses a ON o.address_id = a.id
    WHERE o.id = ?
  `).get(orderId);
  
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden' });
  
  // Only owner or admin can generate invoice
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  
  // Get order items with category for tax calculation
  order.items = db.prepare(`
    SELECT oi.*, p.name, p.unit, c.name as category_name
    FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    JOIN categories c ON p.category_id = c.id
    WHERE oi.order_id = ?
  `).all(orderId);
  
  // Get business settings
  const business = db.prepare('SELECT * FROM business_settings WHERE id = 1').get() || {};
  
  // Generate invoice number
  const invoiceNumber = generateInvoiceNumber(db);
  
  // Calculate tax amounts
  let tax7 = 0, tax19 = 0, net7 = 0, net19 = 0;
  const foodCategories = ['getränke', 'snacks', 'obst', 'gemüse', 'milch', 'brot', 'back', 'fleisch', 'wurst', 'tiefkühl', 'kühl'];
  
  order.items.forEach(item => {
    const lineTotal = item.price * item.quantity;
    const isFood = foodCategories.some(fc => (item.category_name || '').toLowerCase().includes(fc));
    const taxRate = isFood ? 7 : 19;
    
    const netAmount = lineTotal / (1 + taxRate / 100);
    if (taxRate === 7) {
      tax7 += lineTotal - netAmount;
      net7 += netAmount;
    } else {
      tax19 += lineTotal - netAmount;
      net19 += netAmount;
    }
  });
  
  // Delivery fee (19%)
  const deliveryNet = order.delivery_fee / 1.19;
  tax19 += order.delivery_fee - deliveryNet;
  net19 += deliveryNet;
  
  const netTotal = net7 + net19;
  
  // Generate PDF
  order.invoice_number = invoiceNumber;
  order.invoice_date = new Date().toISOString();
  
  try {
    const pdfBuffer = await generateInvoice(order, business);
    
    // Ensure invoices directory exists
    const invoicesDir = path.join(__dirname, 'invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    
    // Save PDF
    const pdfPath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    // Save invoice record
    const invoiceStmt = db.prepare(`
      INSERT INTO invoices (order_id, invoice_number, net_total, tax_7_amount, tax_19_amount, gross_total, pdf_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const invoiceResult = invoiceStmt.run(orderId, invoiceNumber, netTotal, tax7, tax19, order.total, pdfPath);
    
    const invoice = {
      id: invoiceResult.lastInsertRowid,
      order_id: orderId,
      invoice_number: invoiceNumber,
      net_total: netTotal,
      tax_7_amount: tax7,
      tax_19_amount: tax19,
      gross_total: order.total
    };
    
    res.json({ invoice, message: 'Rechnung erstellt' });
  } catch (e) {
    console.error('Invoice generation error:', e);
    res.status(500).json({ error: 'Fehler beim Erstellen der Rechnung: ' + e.message });
  }
});

// Download invoice PDF
app.get('/api/invoices/:invoiceNumber/download', auth(), (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(req.params.invoiceNumber);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });
  
  // Check permission
  const order = db.prepare('SELECT user_id FROM orders WHERE id = ?').get(invoice.order_id);
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  
  if (!fs.existsSync(invoice.pdf_path)) {
    return res.status(404).json({ error: 'PDF nicht gefunden' });
  }
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
  res.sendFile(invoice.pdf_path);
});

// Get invoice for order
app.get('/api/orders/:id/invoice', auth(), (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Keine Rechnung vorhanden' });
  
  // Check permission
  const order = db.prepare('SELECT user_id FROM orders WHERE id = ?').get(invoice.order_id);
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  
  res.json(invoice);
});

// List all invoices (admin)
app.get('/api/admin/invoices', auth(['admin']), (req, res) => {
  const { from, to, limit = 100 } = req.query;
  
  let sql = `
    SELECT i.*, o.user_id, u.name as customer_name, u.email as customer_email
    FROM invoices i
    JOIN orders o ON i.order_id = o.id
    JOIN users u ON o.user_id = u.id
  `;
  const params = [];
  
  if (from || to) {
    const conditions = [];
    if (from) { conditions.push('date(i.invoice_date) >= ?'); params.push(from); }
    if (to) { conditions.push('date(i.invoice_date) <= ?'); params.push(to); }
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  sql += ` ORDER BY i.invoice_date DESC LIMIT ?`;
  params.push(parseInt(limit));
  
  const invoices = db.prepare(sql).all(...params);
  
  // Calculate totals
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(net_total), 0) as net_total,
      COALESCE(SUM(tax_7_amount), 0) as tax_7,
      COALESCE(SUM(tax_19_amount), 0) as tax_19,
      COALESCE(SUM(gross_total), 0) as gross_total
    FROM invoices
    ${from || to ? `WHERE ${from ? 'date(invoice_date) >= ?' : ''} ${from && to ? 'AND' : ''} ${to ? 'date(invoice_date) <= ?' : ''}` : ''}
  `).get(...(from && to ? [from, to] : from ? [from] : to ? [to] : []));
  
  res.json({ invoices, totals });
});

// Invoice stats for dashboard
app.get('/api/admin/invoice-stats', auth(['admin']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  const stats = {
    today: db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(gross_total), 0) as total FROM invoices WHERE date(invoice_date) = ?").get(today),
    month: db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(gross_total), 0) as total FROM invoices WHERE strftime('%Y-%m', invoice_date) = ?").get(thisMonth),
    pending: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered' AND id NOT IN (SELECT order_id FROM invoices)").get()
  };
  
  res.json(stats);
});

// Auto-generate invoice on delivery (can be called from status update)
async function autoGenerateInvoice(orderId) {
  try {
    const existingInvoice = db.prepare('SELECT id FROM invoices WHERE order_id = ?').get(orderId);
    if (existingInvoice) return; // Already exists
    
    const order = db.prepare(`
      SELECT o.*, u.name as customer_name, u.email as customer_email,
             a.street, a.house_number, a.postal_code, a.city
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    `).get(orderId);
    
    if (!order || order.status !== 'delivered') return;
    
    order.items = db.prepare(`
      SELECT oi.*, p.name, p.unit, c.name as category_name
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      JOIN categories c ON p.category_id = c.id
      WHERE oi.order_id = ?
    `).all(orderId);
    
    const business = db.prepare('SELECT * FROM business_settings WHERE id = 1').get() || {};
    const invoiceNumber = generateInvoiceNumber(db);
    
    // Calculate taxes
    let tax7 = 0, tax19 = 0, net7 = 0, net19 = 0;
    const foodCategories = ['getränke', 'snacks', 'obst', 'gemüse', 'milch', 'brot', 'back', 'fleisch', 'wurst', 'tiefkühl'];
    
    order.items.forEach(item => {
      const lineTotal = item.price * item.quantity;
      const isFood = foodCategories.some(fc => (item.category_name || '').toLowerCase().includes(fc));
      const netAmount = lineTotal / (1 + (isFood ? 7 : 19) / 100);
      if (isFood) { tax7 += lineTotal - netAmount; net7 += netAmount; }
      else { tax19 += lineTotal - netAmount; net19 += netAmount; }
    });
    
    const deliveryNet = order.delivery_fee / 1.19;
    tax19 += order.delivery_fee - deliveryNet;
    net19 += deliveryNet;
    
    order.invoice_number = invoiceNumber;
    order.invoice_date = new Date().toISOString();
    
    const pdfBuffer = await generateInvoice(order, business);
    
    const invoicesDir = path.join(__dirname, 'invoices');
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
    
    const pdfPath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    db.prepare(`
      INSERT INTO invoices (order_id, invoice_number, net_total, tax_7_amount, tax_19_amount, gross_total, pdf_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, invoiceNumber, net7 + net19, tax7, tax19, order.total, pdfPath);
    
    console.log(`Invoice ${invoiceNumber} generated for order ${orderId}`);
  } catch (e) {
    console.error('Auto invoice generation error:', e);
  }
}

// ============ PROMO CODES ============

// Validate promo code
app.post('/api/promo/validate', auth(), (req, res) => {
  const { code, subtotal } = req.body;
  
  const promo = db.prepare(`
    SELECT * FROM promo_codes 
    WHERE code = ? AND active = 1
    AND (valid_from IS NULL OR valid_from <= datetime('now'))
    AND (valid_until IS NULL OR valid_until >= datetime('now'))
    AND (max_uses IS NULL OR used_count < max_uses)
  `).get(code.toUpperCase());
  
  if (!promo) {
    return res.status(400).json({ error: 'Ungültiger oder abgelaufener Promo-Code' });
  }
  
  // Check if user already used this code
  const alreadyUsed = db.prepare('SELECT id FROM promo_usage WHERE promo_id = ? AND user_id = ?')
    .get(promo.id, req.user.id);
  
  if (alreadyUsed) {
    return res.status(400).json({ error: 'Du hast diesen Code bereits verwendet' });
  }
  
  // Check minimum order value
  if (subtotal < promo.min_order_value) {
    return res.status(400).json({ 
      error: `Mindestbestellwert: ${promo.min_order_value.toFixed(2)} € (aktuell: ${subtotal.toFixed(2)} €)` 
    });
  }
  
  // Calculate discount
  let discount = 0;
  if (promo.discount_type === 'percent') {
    discount = subtotal * (promo.discount_value / 100);
  } else if (promo.discount_type === 'fixed') {
    discount = Math.min(promo.discount_value, subtotal);
  } else if (promo.discount_type === 'delivery') {
    discount = 2.99; // Free delivery
  }
  
  res.json({
    valid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: discount
    }
  });
});

// Apply promo code to order (internal use)
function applyPromoCode(promoId, userId, orderId, discountAmount) {
  db.prepare('INSERT INTO promo_usage (promo_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)')
    .run(promoId, userId, orderId, discountAmount);
  db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?')
    .run(promoId);
}

// Admin: List all promo codes
app.get('/api/admin/promo', auth(['admin']), (req, res) => {
  const promos = db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
  res.json(promos);
});

// Admin: Create promo code
app.post('/api/admin/promo', auth(['admin']), (req, res) => {
  const { code, description, discount_type, discount_value, min_order_value, max_uses, valid_from, valid_until } = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_value, max_uses, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      code.toUpperCase(), 
      description, 
      discount_type || 'percent', 
      discount_value, 
      min_order_value || 0, 
      max_uses || null,
      valid_from || null,
      valid_until || null
    );
    res.json({ id: result.lastInsertRowid, code: code.toUpperCase() });
  } catch (e) {
    res.status(400).json({ error: 'Code existiert bereits' });
  }
});

// Admin: Update promo code
app.put('/api/admin/promo/:id', auth(['admin']), (req, res) => {
  const { description, discount_type, discount_value, min_order_value, max_uses, valid_from, valid_until, active } = req.body;
  
  db.prepare(`
    UPDATE promo_codes SET description=?, discount_type=?, discount_value=?, min_order_value=?, max_uses=?, valid_from=?, valid_until=?, active=?
    WHERE id = ?
  `).run(description, discount_type, discount_value, min_order_value, max_uses, valid_from, valid_until, active ? 1 : 0, req.params.id);
  
  res.json({ success: true });
});

// Admin: Delete promo code
app.delete('/api/admin/promo/:id', auth(['admin']), (req, res) => {
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ RATINGS ============

// Submit rating for an order
app.post('/api/orders/:id/rating', auth(), (req, res) => {
  console.log("📦 Order request:", JSON.stringify(req.body));
  const { rating, comment } = req.body;
  const orderId = parseInt(req.params.id);
  
  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 sein' });
  }
  
  // Get order
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Bestellung nicht gefunden' });
  }
  
  if (order.status !== 'delivered') {
    return res.status(400).json({ error: 'Nur gelieferte Bestellungen können bewertet werden' });
  }
  
  if (!order.driver_id) {
    return res.status(400).json({ error: 'Kein Fahrer zugewiesen' });
  }
  
  // Check if already rated
  const existingRating = db.prepare('SELECT id FROM ratings WHERE order_id = ?').get(orderId);
  if (existingRating) {
    return res.status(400).json({ error: 'Diese Bestellung wurde bereits bewertet' });
  }
  
  // Insert rating
  const stmt = db.prepare('INSERT INTO ratings (order_id, user_id, driver_id, rating, comment) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(orderId, req.user.id, order.driver_id, rating, comment || null);
  
  res.json({ 
    id: result.lastInsertRowid, 
    rating, 
    message: 'Danke für deine Bewertung!' 
  });
});

// Get rating for an order
app.get('/api/orders/:id/rating', auth(), (req, res) => {
  const rating = db.prepare('SELECT * FROM ratings WHERE order_id = ?').get(req.params.id);
  res.json(rating || null);
});

// Get driver's average rating
app.get('/api/drivers/:id/rating', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      AVG(rating) as average,
      COUNT(*) as count,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
    FROM ratings WHERE driver_id = ?
  `).get(req.params.id);
  
  res.json({
    average: stats.average ? Math.round(stats.average * 10) / 10 : 0,
    count: stats.count || 0,
    distribution: {
      5: stats.five_star || 0,
      4: stats.four_star || 0,
      3: stats.three_star || 0,
      2: stats.two_star || 0,
      1: stats.one_star || 0
    }
  });
});

// ============ PUSH NOTIFICATIONS ============

// Save push subscription
app.post('/api/push/subscribe', auth(), (req, res) => {
  const { endpoint, keys } = req.body;
  
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Ungültige Subscription' });
  }
  
  try {
    db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, endpoint, keys.p256dh, keys.auth);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

// Unsubscribe
app.delete('/api/push/unsubscribe', auth(), (req, res) => {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// Send push notification (internal helper)
async function sendPushNotification(userId, title, body, data = {}) {
  // This would use web-push library in production
  // For now, we'll use socket.io as fallback
  io.emit(`notification-${userId}`, { title, body, data });
}

// ============ AI BARCODE SCANNING ============

// AI Vision barcode recognition using OpenAI GPT-4o
app.post('/api/ai/scan-barcode', async (req, res) => {
  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: 'Kein Bild übermittelt' });
  }
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'OpenAI API nicht konfiguriert' });
  }
  
  console.log('AI Barcode scan request received, image size:', Math.round(image.length / 1024), 'KB');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a barcode reading expert. Your job is to find and read barcode numbers from product images. Look carefully at the image for any barcode - it could be on packaging, labels, cans, bottles, or boxes. Barcodes are vertical black and white lines with numbers printed below them.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please find the barcode in this image and tell me the number. Look for:\n- EAN-13 (13 digits, common in Europe)\n- EAN-8 (8 digits)\n- UPC-A (12 digits, common in USA)\n- Any product barcode with vertical lines\n\nThe barcode might be on a can, bottle, box, or any product packaging. Look at the entire image carefully.\n\nRespond with ONLY the barcode number (digits only). If you cannot find or read any barcode, respond with exactly: NONE'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return res.json({ barcode: null, error: data.error.message });
    }
    
    const result = data.choices?.[0]?.message?.content?.trim();
    console.log('AI barcode raw result:', result);
    
    // Check if result is exactly NONE
    if (!result || result === 'NONE' || result.toLowerCase().includes('cannot') || result.toLowerCase().includes('unable')) {
      console.log('AI could not find barcode');
      return res.json({ barcode: null });
    }
    
    // Extract digits from result (barcode should be 8-14 digits)
    const digits = result.replace(/\D/g, '');
    console.log('AI extracted digits:', digits);
    
    if (digits.length >= 8 && digits.length <= 14) {
      console.log('✅ AI found valid barcode:', digits);
      return res.json({ barcode: digits });
    }
    
    // Try to find a barcode pattern in the response
    const barcodeMatch = result.match(/\b\d{8,14}\b/);
    if (barcodeMatch) {
      console.log('✅ AI found barcode in text:', barcodeMatch[0]);
      return res.json({ barcode: barcodeMatch[0] });
    }
    
    console.log('No valid barcode found in AI response');
    return res.json({ barcode: null });
    
  } catch (err) {
    console.error('AI scan error:', err);
    return res.status(500).json({ error: 'AI-Analyse fehlgeschlagen' });
  }
});

// AI Product identification from image (when barcode lookup fails)
app.post('/api/ai/identify-product', async (req, res) => {
  const { image, barcode } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: 'Kein Bild übermittelt' });
  }
  
  if (!OPENAI_API_KEY) {
    return res.json({ product: null });
  }
  
  console.log('AI product identification for barcode:', barcode);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a product identification expert. Analyze product images and provide detailed product information in JSON format.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Identify this product from the image. The barcode is: ${barcode || 'unknown'}

Please analyze the image and return a JSON object with these fields:
{
  "name": "Product name in German",
  "brand": "Brand name",
  "category": "One of: Getränke, Snacks, Süßigkeiten, Obst & Gemüse, Milchprodukte, Tiefkühl, Haushalt, Pflege, Tabak, Alkohol, Sonstiges",
  "description": "Short description in German",
  "quantity_info": "Size/weight if visible (e.g. 500ml, 250g, 20 Stück)",
  "estimated_price": "Estimated price in EUR if you can guess, or null"
}

Return ONLY the JSON object, no other text.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI error:', data.error);
      return res.json({ product: null });
    }
    
    const result = data.choices?.[0]?.message?.content?.trim();
    console.log('AI product identification result:', result);
    
    try {
      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = result;
      if (result.includes('```')) {
        jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      const product = JSON.parse(jsonStr);
      return res.json({ product, source: 'AI Vision' });
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr);
      return res.json({ product: null });
    }
    
  } catch (err) {
    console.error('AI identify error:', err);
    return res.json({ product: null });
  }
});

// ============ INVENTORY / WAREHOUSE MANAGEMENT ============

// Get all inventory items
app.get('/api/inventory', auth(['admin']), (req, res) => {
  const items = db.prepare(`
    SELECT i.*, p.name as product_name 
    FROM inventory i 
    LEFT JOIN products p ON i.product_id = p.id 
    ORDER BY i.name ASC
  `).all();
  res.json(items);
});

// Get inventory item by barcode
app.get('/api/inventory/barcode/:barcode', auth(['admin']), (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE barcode = ?').get(req.params.barcode);
  res.json(item || null);
});

// Add inventory item (from barcode scan)
app.post('/api/inventory/add', auth(['admin']), (req, res) => {
  const { barcode, name, brand, category, price, image, quantity, source } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Produktname erforderlich' });
  }

  try {
    // Check if barcode already exists
    if (barcode) {
      const existing = db.prepare('SELECT * FROM inventory WHERE barcode = ?').get(barcode);
      if (existing) {
        // Update stock instead
        db.prepare('UPDATE inventory SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(quantity || 1, existing.id);
        
        // Log transaction
        db.prepare(`
          INSERT INTO inventory_transactions (inventory_id, change_amount, type, user_id)
          VALUES (?, ?, 'addition', ?)
        `).run(existing.id, quantity || 1, req.user.id);
        
        return res.json({ 
          id: existing.id, 
          updated: true, 
          stock: existing.stock + (quantity || 1) 
        });
      }
    }
    
    // Map category name to category_id
    const categoryMap = {
      'Getränke': 4,
      'Snacks': 5,
      'Süßigkeiten': 6,
      'Obst & Gemüse': 1,
      'Milchprodukte': 2,
      'Tiefkühl': 7,
      'Haushalt': 9,
      'Pflege': 10,
      'Sonstiges': 8
    };
    
    // First, create product in the shop (products table)
    let productId = null;
    const categoryId = categoryMap[category] || 8; // Default to Sonstiges (8)
    
    try {
      const productResult = db.prepare(`
        INSERT INTO products (category_id, name, description, price, image, unit, unit_amount, stock_count, in_stock)
        VALUES (?, ?, ?, ?, ?, 'Stück', '1', ?, 1)
      `).run(
        categoryId,
        brand ? `${brand} ${name}` : name,
        brand ? `${name} von ${brand}` : name,
        price || 0,
        image || null,
        quantity || 1
      );
      productId = productResult.lastInsertRowid;
    } catch (prodErr) {
      console.log('Product creation skipped (may already exist):', prodErr.message);
    }
    
    // Insert into inventory
    const result = db.prepare(`
      INSERT INTO inventory (barcode, name, brand, category, price, image, stock, source, product_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      barcode || null, 
      name, 
      brand || null, 
      category || 'Sonstiges',
      price || null,
      image || null,
      quantity || 1,
      source || 'Manual',
      productId
    );
    
    // Log transaction
    db.prepare(`
      INSERT INTO inventory_transactions (inventory_id, change_amount, type, user_id)
      VALUES (?, ?, 'initial', ?)
    `).run(result.lastInsertRowid, quantity || 1, req.user.id);
    
    res.json({ 
      id: result.lastInsertRowid, 
      product_id: productId,
      created: true 
    });
  } catch (e) {
    console.error('Inventory add error:', e);
    res.status(500).json({ error: 'Fehler beim Hinzufügen' });
  }
});

// Update inventory stock
app.patch('/api/inventory/:id/stock', auth(['admin']), (req, res) => {
  const { change, reason } = req.body;
  const id = req.params.id;
  
  if (typeof change !== 'number') {
    return res.status(400).json({ error: 'Änderungswert erforderlich' });
  }
  
  try {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({ error: 'Produkt nicht gefunden' });
    }
    
    const newStock = Math.max(0, item.stock + change);
    
    db.prepare('UPDATE inventory SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStock, id);
    
    // Log transaction
    db.prepare(`
      INSERT INTO inventory_transactions (inventory_id, change_amount, type, reason, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, change, change > 0 ? 'addition' : 'removal', reason || null, req.user.id);
    
    res.json({ id, stock: newStock });
  } catch (e) {
    console.error('Stock update error:', e);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// Update inventory item details
app.patch('/api/inventory/:id', auth(['admin']), (req, res) => {
  const { name, brand, category, price, image, min_stock, barcode } = req.body;
  const id = req.params.id;
  
  try {
    db.prepare(`
      UPDATE inventory 
      SET name = COALESCE(?, name),
          brand = COALESCE(?, brand),
          category = COALESCE(?, category),
          price = COALESCE(?, price),
          image = COALESCE(?, image),
          min_stock = COALESCE(?, min_stock),
          barcode = COALESCE(?, barcode),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, brand, category, price, image, min_stock, barcode, id);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// Delete inventory item
app.delete('/api/inventory/:id', auth(['admin']), (req, res) => {
  try {
    db.prepare('DELETE FROM inventory_transactions WHERE inventory_id = ?').run(req.params.id);
    db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// Get inventory transaction history
app.get('/api/inventory/:id/history', auth(['admin']), (req, res) => {
  const history = db.prepare(`
    SELECT t.*, u.name as user_name
    FROM inventory_transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.inventory_id = ?
    ORDER BY t.created_at DESC
    LIMIT 50
  `).all(req.params.id);
  res.json(history);
});

// Get low stock alerts
app.get('/api/inventory/alerts/low-stock', auth(['admin']), (req, res) => {
  const items = db.prepare(`
    SELECT * FROM inventory 
    WHERE stock <= min_stock 
    ORDER BY stock ASC
  `).all();
  res.json(items);
});

// Link inventory item to product
app.post('/api/inventory/:id/link-product', auth(['admin']), (req, res) => {
  const { product_id } = req.body;
  
  try {
    db.prepare('UPDATE inventory SET product_id = ? WHERE id = ?')
      .run(product_id, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Verknüpfen' });
  }
});


// ============ IMAGE UPLOAD ============
const multer = require('multer');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const productsDir = path.join(uploadsDir, 'products');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });

// Use memory storage for image processing
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mimeOk = /image\//.test(file.mimetype);
    cb(null, mimeOk);
  }
});

// Upload product image with automatic optimization
app.post('/api/upload/product', auth(['admin']), uploadMemory.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }
  
  try {
    const filename = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const outputPath = path.join(productsDir, filename);
    
    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);
    
    console.log('📸 Image optimized:', req.file.originalname, '->', filename);
    res.json({ url: `/uploads/products/${filename}` });
  } catch (err) {
    console.error('Image processing error:', err);
    res.status(500).json({ error: 'Bildverarbeitung fehlgeschlagen' });
  }
});

// Update product image
app.patch('/api/products/:id/image', auth(['admin']), (req, res) => {
  const { image } = req.body;
  
  try {
    db.prepare('UPDATE products SET image = ? WHERE id = ?').run(image, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`);
  });
  
  socket.on('join-support', (ticketId) => {
    socket.join(`support-${ticketId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ============ WAITLIST FOR OTHER CITIES ============// Create waitlist tabledb.exec(`  CREATE TABLE IF NOT EXISTS waitlist (    id INTEGER PRIMARY KEY AUTOINCREMENT,    email TEXT NOT NULL,    city TEXT NOT NULL,    postal_code TEXT,    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,    notified INTEGER DEFAULT 0,    UNIQUE(email, city)  )`);// POST /api/waitlist - Join waitlist for a cityapp.post("/api/waitlist", (req, res) => {  const { email, city, postalCode } = req.body;    if (!email || !city) {    return res.status(400).json({ error: "Email und Stadt erforderlich" });  }    try {    db.prepare("INSERT OR IGNORE INTO waitlist (email, city, postal_code) VALUES (?, ?, ?)").run(email, city, postalCode || null);    console.log("📝 Waitlist signup:", email, "for", city);        // Send welcome email    emailService.sendEmail(email, "Du bist auf der Warteliste! 🚀", emailService.waitlistEmail(email, city));        res.json({ success: true, message: "Du wirst benachrichtigt sobald wir in deiner Stadt starten!" });  } catch (e) {    res.status(400).json({ error: "Bereits auf der Warteliste" });  }});// GET /api/admin/waitlist - Admin: See waitlistapp.get("/api/admin/waitlist", auth(["admin"]), (req, res) => {  const waitlist = db.prepare("SELECT * FROM waitlist ORDER BY created_at DESC").all();  res.json(waitlist);});
// Catch-all for SPA
// ============ SHOP STATUS & ÖFFNUNGSZEITEN ============

// Shop status cache (in-memory for fast access)
let shopStatus = {
  manuallyOpen: null, // null = use schedule, true = force open, false = force closed
  openingTime: '08:00',
  closingTime: '22:00',
  timezone: 'Europe/Berlin'
};

// Load shop status from settings on startup
try {
  const savedSettings = db.prepare("SELECT * FROM settings WHERE key IN ('shop_manually_open', 'opening_time', 'closing_time')").all();
  savedSettings.forEach(s => {
    if (s.key === 'shop_manually_open') shopStatus.manuallyOpen = s.value === 'true' ? true : s.value === 'false' ? false : null;
    if (s.key === 'opening_time') shopStatus.openingTime = s.value;
    if (s.key === 'closing_time') shopStatus.closingTime = s.value;
  });
} catch (e) {
  console.log('Shop status defaults used');
}

// Helper: Check if shop is currently open
function isShopOpen() {
  // Manual override takes priority
  if (shopStatus.manuallyOpen === true) return { open: true, reason: 'manual', message: 'Manuell geöffnet' };
  if (shopStatus.manuallyOpen === false) return { open: false, reason: 'manual', message: 'Aktuell geschlossen' };
  
  // Check schedule
  const now = new Date();
  const berlinTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  const currentHours = berlinTime.getHours();
  const currentMinutes = berlinTime.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;
  
  const [openH, openM] = shopStatus.openingTime.split(':').map(Number);
  const [closeH, closeM] = shopStatus.closingTime.split(':').map(Number);
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;
  
  if (currentTime >= openTime && currentTime < closeTime) {
    return { open: true, reason: 'schedule', message: 'Geöffnet' };
  }
  
  return { 
    open: false, 
    reason: 'schedule', 
    message: `Geschlossen · Öffnet um ${shopStatus.openingTime} Uhr`,
    nextOpen: shopStatus.openingTime
  };
}

// GET /api/shop/status - Public endpoint
app.get('/api/shop/status', (req, res) => {
  const status = isShopOpen();
  res.json({
    ...status,
    openingTime: shopStatus.openingTime,
    closingTime: shopStatus.closingTime,
    manualOverride: shopStatus.manuallyOpen,
    currentTime: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
  });
});

// POST /api/admin/shop/toggle - Admin toggle
app.post('/api/admin/shop/toggle', auth(['admin']), (req, res) => {
  const { action } = req.body; // 'open', 'close', 'auto'
  
  if (action === 'open') {
    shopStatus.manuallyOpen = true;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_manually_open', 'true')").run();
  } else if (action === 'close') {
    shopStatus.manuallyOpen = false;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_manually_open', 'false')").run();
  } else {
    shopStatus.manuallyOpen = null;
    db.prepare("DELETE FROM settings WHERE key = 'shop_manually_open'").run();
  }
  
  const status = isShopOpen();
  console.log('🏪 Shop status changed:', action, status);
  res.json({ success: true, ...status });
});

// PUT /api/admin/shop/hours - Update opening hours
app.put('/api/admin/shop/hours', auth(['admin']), (req, res) => {
  const { openingTime, closingTime } = req.body;
  
  if (openingTime) {
    shopStatus.openingTime = openingTime;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('opening_time', ?)").run(openingTime);
  }
  if (closingTime) {
    shopStatus.closingTime = closingTime;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('closing_time', ?)").run(closingTime);
  }
  
  res.json({ 
    success: true, 
    openingTime: shopStatus.openingTime, 
    closingTime: shopStatus.closingTime 
  });
});


// ============ WAITLIST FOR OTHER CITIES ============

// Create waitlist table
db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified INTEGER DEFAULT 0,
    UNIQUE(email, city)
  )
`);

// POST /api/waitlist - Join waitlist for a city
app.post('/api/waitlist', (req, res) => {
  const { email, city, postalCode } = req.body;
  
  if (!email || !city) {
    return res.status(400).json({ error: 'Email und Stadt erforderlich' });
  }
  
  try {
    db.prepare('INSERT OR IGNORE INTO waitlist (email, city, postal_code) VALUES (?, ?, ?)').run(email, city, postalCode || null);
    console.log('📝 Waitlist signup:', email, 'for', city);
    
    // Send welcome email (async, don't wait)
    emailService.sendEmail(email, 'Du bist auf der Warteliste! 🚀', emailService.waitlistEmail(email, city)).catch(() => {});
    
    res.json({ success: true, message: 'Du wirst benachrichtigt sobald wir in deiner Stadt starten!' });
  } catch (e) {
    res.status(400).json({ error: 'Bereits auf der Warteliste' });
  }
});

// GET /api/admin/waitlist - Admin: See waitlist
app.get('/api/admin/waitlist', auth(['admin']), (req, res) => {
  const waitlist = db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC').all();
  res.json(waitlist);
});


// ================================================

// ================================================
// SHOP SETTINGS (Mindestbestellwert, Liefergebühren)
// ================================================

// Initialize shop_settings table (better-sqlite3 syntax)
db.exec(`CREATE TABLE IF NOT EXISTS shop_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Default settings
const defaultSettings = {
  min_order_value: '15.00',
  delivery_fee: '2.99',
  free_delivery_threshold: '30.00',
  delivery_radius_km: '5'
};

const insertSettingStmt = db.prepare('INSERT OR IGNORE INTO shop_settings (key, value) VALUES (?, ?)');
Object.entries(defaultSettings).forEach(([key, value]) => {
  insertSettingStmt.run(key, value);
});

// Get shop settings (public)
app.get('/api/shop/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM shop_settings').all();
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================
// ORDER TRACKING (Public)
// ================================================

app.get('/api/track/:orderNumber', (req, res) => {
  try {
    const rawInput = req.params.orderNumber.trim();
    const numOnly = rawInput.replace(/^(SPT-|SPEETI-)/i, '').replace(/^0+/, '');
    const paddedNum = numOnly.padStart(5, '0');
    const sptFormat = 'SPT-' + paddedNum;
    const { token, email } = req.query;
    
    const order = db.prepare(`
      SELECT 
        o.id, o.order_number, o.track_token, o.status, o.total, o.delivery_fee, 
        o.created_at, o.scheduled_time,
        a.street, a.house_number, a.postal_code as plz, a.city,
        u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ? OR o.order_number = ? OR o.order_number = ? OR o.order_number LIKE ?
      LIMIT 1
    `).get(numOnly, rawInput, sptFormat, '%' + numOnly);
    
    if (!order) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    }
    
    // Security: require token OR matching email
    const isValidToken = token && order.track_token && token === order.track_token;
    const isValidEmail = email && order.customer_email && 
                         email.toLowerCase() === order.customer_email.toLowerCase();
    
    if (!isValidToken && !isValidEmail) {
      return res.json({
        orderNumber: order.order_number,
        requiresVerification: true,
        message: 'Bitte gib deine E-Mail-Adresse ein, um die Bestellung zu verifizieren.'
      });
    }
    
    const items = db.prepare(`
      SELECT oi.quantity, oi.price, p.name, p.image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);
    
    const statusTimeline = {
      pending: { step: 1, label: 'Bestellung eingegangen', icon: '📋' },
      confirmed: { step: 2, label: 'Bestellung bestätigt', icon: '✅' },
      preparing: { step: 3, label: 'Wird vorbereitet', icon: '👨🍳' },
      ready: { step: 4, label: 'Bereit zur Auslieferung', icon: '📦' },
      delivering: { step: 5, label: 'Auf dem Weg', icon: '🚴' },
      delivered: { step: 6, label: 'Geliefert', icon: '🎉' },
      cancelled: { step: 0, label: 'Storniert', icon: '❌' }
    };
    
    const currentStatus = statusTimeline[order.status] || statusTimeline.pending;
    
    res.json({
      verified: true,
      orderNumber: order.order_number,
      status: order.status,
      statusInfo: currentStatus,
      total: order.total,
      deliveryFee: order.delivery_fee,
      address: { street: order.street, houseNumber: order.house_number, plz: order.plz, city: order.city },
      customerName: order.customer_name?.split(' ')[0] || 'Kunde',
      items,
      createdAt: order.created_at,
      scheduledTime: order.scheduled_time,
      timeline: Object.entries(statusTimeline)
        .filter(([key]) => key !== 'cancelled')
        .map(([key, val]) => ({
          status: key, ...val,
          completed: val.step <= currentStatus.step && order.status !== 'cancelled',
          current: key === order.status
        }))
    });
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ================================================
// ADMIN SETTINGS (Full settings management)
// ================================================

// Get all admin settings
app.get('/api/admin/settings', auth(['admin']), (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM shop_settings').all();
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save admin settings (bulk)
app.post('/api/admin/settings', auth(['admin']), (req, res) => {
  try {
    const settings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO shop_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))');
    
    // Map frontend keys to backend keys
    const keyMap = {
      deliveryFee: 'delivery_fee',
      freeDeliveryMin: 'free_delivery_threshold',
      minOrder: 'min_order_value'
    };
    
    Object.entries(settings).forEach(([key, value]) => {
      const dbKey = keyMap[key] || key;
      stmt.run(dbKey, String(value));
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for SPA

// ============ DYNAMIC SITEMAP ============
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://speeti.de';
  const today = new Date().toISOString().split('T')[0];
  
  // Get all categories with products
  const categories = db.prepare('SELECT slug FROM categories WHERE id IN (SELECT DISTINCT category_id FROM products WHERE in_stock = 1)').all();
  
  // Get all visible products
  const products = db.prepare('SELECT id, slug, created_at FROM products WHERE in_stock = 1 AND (visible = 1 OR visible IS NULL)').all();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Homepage
  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  
  // Search
  xml += `  <url>\n    <loc>${baseUrl}/search</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  
  // Categories
  categories.forEach(cat => {
    xml += `  <url>\n    <loc>${baseUrl}/category/${cat.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });
  
  // Products
  products.forEach(p => {
    const lastmod = p.created_at ? p.created_at.split(' ')[0] : today;
    xml += `  <url>\n    <loc>${baseUrl}/produkt/${p.slug || p.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });
  
  // Static pages
  ['impressum', 'datenschutz', 'agb', 'support', 'track'].forEach(page => {
    xml += `  <url>\n    <loc>${baseUrl}/${page}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  });
  
  xml += '</urlset>';
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});


// ============ DYNAMIC SITEMAP ============
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://speeti.de';
  const today = new Date().toISOString().split('T')[0];
  
  // Get all categories with products
  const categories = db.prepare('SELECT slug FROM categories WHERE id IN (SELECT DISTINCT category_id FROM products WHERE in_stock = 1)').all();
  
  // Get all visible products
  const products = db.prepare('SELECT id, slug, created_at FROM products WHERE in_stock = 1 AND (visible = 1 OR visible IS NULL)').all();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Homepage
  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  
  // Search
  xml += `  <url>\n    <loc>${baseUrl}/search</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  
  // Categories
  categories.forEach(cat => {
    xml += `  <url>\n    <loc>${baseUrl}/category/${cat.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });
  
  // Products
  products.forEach(p => {
    const lastmod = p.created_at ? p.created_at.split(' ')[0] : today;
    xml += `  <url>\n    <loc>${baseUrl}/produkt/${p.slug || p.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });
  
  // Static pages
  ['impressum', 'datenschutz', 'agb', 'support', 'track'].forEach(page => {
    xml += `  <url>\n    <loc>${baseUrl}/${page}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  });
  
  xml += '</urlset>';
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});


// ============ SEO HELPERS ============
function generateSlug(name, id) {
  const base = name.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return base + '-' + id;
}

// Get product by slug (SEO-friendly URL)
app.get('/api/products/slug/:slug', (req, res) => {
  const product = db.prepare('SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE p.slug = ?').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden' });
  res.json(product);
});

// ============ REVIEWS ============

// Submit a review (public, uses order token for auth)
app.post("/api/reviews", async (req, res) => {
  try {
    const { order_number, token, order_rating, order_comment, driver_rating, driver_comment } = req.body;
    
    if (!order_number || !token) {
      return res.status(400).json({ error: "Bestellnummer und Token erforderlich" });
    }
    
    // Find order and verify token
    const order = db.prepare(`
      SELECT o.id, o.user_id, o.driver_id, o.track_token, o.status
      FROM orders o WHERE o.order_number = ?
    `).get(order_number);
    
    if (!order || order.track_token !== token) {
      return res.status(403).json({ error: "Ungültiger Token" });
    }
    
    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Nur zugestellte Bestellungen können bewertet werden" });
    }
    
    // Check if already reviewed
    const existing = db.prepare("SELECT id FROM reviews WHERE order_id = ?").get(order.id);
    if (existing) {
      return res.status(400).json({ error: "Diese Bestellung wurde bereits bewertet" });
    }
    
    // Insert review
    const result = db.prepare(`
      INSERT INTO reviews (order_id, user_id, order_rating, order_comment, driver_rating, driver_comment, driver_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(order.id, order.user_id, order_rating || null, order_comment || null, driver_rating || null, driver_comment || null, order.driver_id);
    
    res.json({ success: true, id: result.lastInsertRowid, message: "Danke für deine Bewertung! 🌟" });
  } catch (e) {
    console.error("Review error:", e);
    res.status(500).json({ error: "Fehler beim Speichern" });
  }
});

// Get review for an order (public with token)
app.get("/api/reviews/:orderNumber", (req, res) => {
  const { token } = req.query;
  
  const order = db.prepare("SELECT id, track_token FROM orders WHERE order_number = ?").get(req.params.orderNumber);
  if (!order || (token && order.track_token !== token)) {
    return res.status(404).json({ error: "Bestellung nicht gefunden" });
  }
  
  const review = db.prepare("SELECT * FROM reviews WHERE order_id = ?").get(order.id);
  res.json({ review: review || null, canReview: !review });
});

// Admin: Get all reviews
app.get("/api/admin/reviews", auth(["admin"]), (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, o.order_number, u.name as customer_name, d.name as driver_name
    FROM reviews r
    LEFT JOIN orders o ON r.order_id = o.id
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users d ON r.driver_id = d.id
    ORDER BY r.created_at DESC
    LIMIT 100
  `).all();
  res.json(reviews);
});

// Driver: Get own reviews
app.get("/api/driver/reviews", auth(["driver"]), (req, res) => {
  const reviews = db.prepare(`
    SELECT r.driver_rating, r.driver_comment, r.created_at, o.order_number
    FROM reviews r
    JOIN orders o ON r.order_id = o.id
    WHERE r.driver_id = ? AND r.driver_rating IS NOT NULL
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  
  const avg = db.prepare("SELECT AVG(driver_rating) as avg FROM reviews WHERE driver_id = ? AND driver_rating IS NOT NULL").get(req.user.id);
  
  res.json({ reviews, averageRating: avg?.avg || 0 });
});

// Send tracking link via email (secure - no confirmation if email matches)
app.post("/api/track/send-link", async (req, res) => {
  const { order_number, email } = req.body;

  // Normalize order number
  const numOnly = order_number.toString().replace(/^(SPT-|SPEETI-)/i, "").replace(/^0+/, "");
  const sptFormat = "SPT-" + numOnly.padStart(5, "0");
  
  if (!order_number || !email) {
    return res.status(400).json({ error: "Bestellnummer und E-Mail erforderlich" });
  }
  
  // Always return success (don't reveal if email matches!)
  res.json({ 
    success: true, 
    message: "Wenn diese E-Mail-Adresse zu der Bestellung gehört, erhältst du in Kürze einen Link per E-Mail." 
  });
  
  // Check in background and send email if matches
  try {
    const order = db.prepare(`
      SELECT o.id, o.order_number, o.track_token, o.status, o.total, u.email as customer_email, u.name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.order_number = ? OR o.id = ? OR o.order_number = ?
    `).get(order_number, numOnly, sptFormat);
    
    if (order && order.customer_email && order.customer_email.toLowerCase() === email.toLowerCase()) {
      const trackUrl = "https://speeti.de/track/" + order.order_number + "?token=" + order.track_token;
      
      await emailService.sendEmail(
        order.customer_email,
        "🔗 Dein Tracking-Link für Bestellung #" + order.order_number,
        `<!DOCTYPE html>
        <html><head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,sans-serif;padding:20px;background:#f5f5f5;">
          <div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#ec4899,#f43f5e);padding:30px;text-align:center;">
              <h1 style="color:white;margin:0;">🔗 Tracking-Link</h1>
            </div>
            <div style="padding:30px;">
              <p>Hallo <strong>${order.name || ""}!</strong></p>
              <p>Du hast einen Tracking-Link für deine Bestellung angefordert:</p>
              <div style="background:#fdf2f8;padding:15px;border-radius:8px;margin:20px 0;text-align:center;">
                <p style="margin:0;color:#666;">Bestellnummer</p>
                <p style="margin:5px 0 0 0;font-size:20px;font-weight:bold;color:#ec4899;">#${order.order_number}</p>
              </div>
              <div style="text-align:center;margin:30px 0;">
                <a href="${trackUrl}" style="display:inline-block;background:#ec4899;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;">📍 Bestellung verfolgen</a>
              </div>
              <p style="color:#666;font-size:13px;background:#f9f9f9;padding:12px;border-radius:8px;">
                🔒 Dieser Link ist nur für dich bestimmt. Teile ihn nicht mit anderen.
              </p>
            </div>
            <div style="background:#1f2937;color:#9ca3af;padding:20px;text-align:center;font-size:12px;">
              <p style="margin:0;">🚴 Speeti • Dein Lieferservice in Münster</p>
            </div>
          </div>
        </body></html>`
      );
      console.log("📧 Tracking link sent to:", order.customer_email);
    }
  } catch (e) {
    console.error("Error sending tracking link:", e);
  }
});


// Admin endpoint to view errors
app.get("/api/admin/errors", auth(["admin"]), (req, res) => {
  res.json(frontendErrors);
});

// Clear errors
app.delete("/api/admin/errors", auth(["admin"]), (req, res) => {
  frontendErrors.length = 0;
  res.json({ cleared: true });
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// ================================================
// START SERVER
// ================================================
server.listen(PORT, () => {
  console.log(`🚀 Speeti Backend running on port ${PORT}`);
});

// ============ ERROR TRACKING ============
// Store frontend errors for debugging
const frontendErrors = [];

app.post("/api/errors/log", (req, res) => {
  try {
    const { message, stack, componentStack, url, userAgent, timestamp } = req.body;
    
    const error = {
      id: Date.now(),
      message: message?.substring(0, 500) || "Unknown error",
      stack: stack?.substring(0, 2000) || "",
      componentStack: componentStack?.substring(0, 1000) || "",
      url: url?.substring(0, 200) || "",
      userAgent: userAgent?.substring(0, 200) || "",
      timestamp: timestamp || new Date().toISOString(),
      ip: req.ip
    };
    
    // Keep last 100 errors in memory
    frontendErrors.unshift(error);
    if (frontendErrors.length > 100) frontendErrors.pop();
    
    // Log to console for PM2 logs
    console.error("🚨 FRONTEND ERROR:", error.message, "| URL:", error.url);
    
    res.json({ received: true });
  } catch (e) {
    res.json({ received: false });
  }
});

