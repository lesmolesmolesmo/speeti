const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
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

  -- Chat Messages
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  -- Store Settings
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const JWT_SECRET = process.env.JWT_SECRET || 'speeti-secret-key-2024';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)');
    const result = stmt.run(email, hash, name, phone || null);
    
    const token = jwt.sign({ id: result.lastInsertRowid, email, role: 'customer' }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, email, name, role: 'customer' } });
  } catch (e) {
    res.status(400).json({ error: 'Email bereits registriert' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/auth/me', auth(), (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, role, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
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
    sql += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND p.name LIKE ?';
    params.push(`%${search}%`);
  }
  if (featured) {
    sql += ' AND p.featured = 1';
  }
  
  sql += ' ORDER BY p.sort_order, p.name';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produkt nicht gefunden' });
  res.json(product);
});

app.post('/api/admin/products', auth(['admin']), (req, res) => {
  const { category_id, name, description, price, original_price, image, unit, unit_amount, stock_count, featured } = req.body;
  const stmt = db.prepare(`INSERT INTO products (category_id, name, description, price, original_price, image, unit, unit_amount, stock_count, featured) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const result = stmt.run(category_id, name, description || null, price, original_price || null, image || null, unit || 'Stück', unit_amount || '1', stock_count || 100, featured ? 1 : 0);
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/admin/products/:id', auth(['admin']), (req, res) => {
  const { category_id, name, description, price, original_price, image, unit, unit_amount, in_stock, stock_count, featured, sort_order } = req.body;
  db.prepare(`UPDATE products SET category_id=?, name=?, description=?, price=?, original_price=?, image=?, unit=?, unit_amount=?, in_stock=?, stock_count=?, featured=?, sort_order=? WHERE id=?`)
    .run(category_id, name, description, price, original_price, image, unit, unit_amount, in_stock ? 1 : 0, stock_count, featured ? 1 : 0, sort_order || 0, req.params.id);
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
  const { label, street, house_number, postal_code, city, instructions, is_default, lat, lng } = req.body;
  
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  
  const stmt = db.prepare('INSERT INTO addresses (user_id, label, street, house_number, postal_code, city, instructions, is_default, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(req.user.id, label || 'Zuhause', street, house_number, postal_code, city || 'Münster', instructions || null, is_default ? 1 : 0, lat || null, lng || null);
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
           ORDER BY o.created_at DESC`;
    params = [];
  } else if (req.user.role === 'driver') {
    // Drivers see: 
    // 1. All unassigned confirmed orders (available to pick up)
    // 2. All orders assigned to them (regardless of status)
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
    sql = `SELECT o.*, a.street, a.house_number, a.postal_code, a.city
           FROM orders o JOIN addresses a ON o.address_id = a.id
           WHERE o.user_id = ? ORDER BY o.created_at DESC`;
    params = [req.user.id];
  }
  
  const orders = db.prepare(sql).all(...params);
  
  // Add items to each order
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
  
  res.json(order);
});

app.post('/api/orders', auth(), (req, res) => {
  const { address_id, items, payment_method, notes } = req.body;
  
  // Calculate totals
  let subtotal = 0;
  const productIds = items.map(i => i.product_id);
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`).all(...productIds);
  
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) subtotal += product.price * item.quantity;
  });
  
  const delivery_fee = 2.99;
  const total = subtotal + delivery_fee;
  const estimated = new Date(Date.now() + 20 * 60000).toISOString(); // 20 min
  
  // Auto-confirm order (skip pending for now)
  const orderStmt = db.prepare(`INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total, payment_method, notes, estimated_delivery) VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)`);
  const orderResult = orderStmt.run(req.user.id, address_id, subtotal, delivery_fee, total, payment_method || 'cash', notes || null, estimated);
  const orderId = orderResult.lastInsertRowid;
  
  // Insert items
  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) itemStmt.run(orderId, item.product_id, item.quantity, product.price);
  });
  
  // Notify via socket
  io.emit('new-order', { orderId });
  
  res.json({ id: orderId, total, estimated_delivery: estimated });
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
  
  // Notify via socket
  io.emit('order-update', { orderId: parseInt(req.params.id), status });
  
  res.json({ success: true });
});

// Pick item
app.patch('/api/orders/:id/items/:itemId/pick', auth(['driver']), (req, res) => {
  db.prepare('UPDATE order_items SET picked = 1 WHERE id = ? AND order_id = ?').run(req.params.itemId, req.params.id);
  io.emit('item-picked', { orderId: parseInt(req.params.id), itemId: parseInt(req.params.itemId) });
  res.json({ success: true });
});

// ============ CHAT ============

app.post('/api/orders/:id/messages', auth(), (req, res) => {
  const { message } = req.body;
  const stmt = db.prepare('INSERT INTO messages (order_id, sender_id, message) VALUES (?, ?, ?)');
  const result = stmt.run(req.params.id, req.user.id, message);
  
  const msg = {
    id: result.lastInsertRowid,
    order_id: parseInt(req.params.id),
    sender_id: req.user.id,
    sender_name: req.user.name || 'User',
    message,
    created_at: new Date().toISOString()
  };
  
  io.emit('new-message', msg);
  res.json(msg);
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
    total_drivers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver'").get().count
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

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Speeti Backend running on port ${PORT}`);
});
