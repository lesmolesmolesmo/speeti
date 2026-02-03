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
`);

// Add new columns if they don't exist (for existing databases)
try {
  db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`);
} catch(e) {}
try {
  db.exec(`ALTER TABLE orders ADD COLUMN stripe_session_id TEXT`);
} catch(e) {}

const JWT_SECRET = process.env.JWT_SECRET || 'speeti-secret-key-2024';
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

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
    
    const token = jwt.sign({ id: result.lastInsertRowid, email, name, role: 'customer' }, JWT_SECRET);
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
  
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone } });
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
           WHERE o.user_id = ? ORDER BY o.created_at DESC`;
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
  
  res.json(order);
});

app.post('/api/orders', auth(), (req, res) => {
  const { address_id, items, payment_method, notes } = req.body;
  
  let subtotal = 0;
  const productIds = items.map(i => i.product_id);
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`).all(...productIds);
  
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) subtotal += product.price * item.quantity;
  });
  
  const delivery_fee = 2.99;
  const total = subtotal + delivery_fee;
  const estimated = new Date(Date.now() + 20 * 60000).toISOString();
  
  const orderStmt = db.prepare(`INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total, payment_method, notes, estimated_delivery) VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)`);
  const orderResult = orderStmt.run(req.user.id, address_id, subtotal, delivery_fee, total, payment_method || 'cash', notes || null, estimated);
  const orderId = orderResult.lastInsertRowid;
  
  const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
  items.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) itemStmt.run(orderId, item.product_id, item.quantity, product.price);
  });
  
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
  
  io.emit('order-update', { orderId: parseInt(req.params.id), status });
  
  res.json({ success: true });
});

app.patch('/api/orders/:id/items/:itemId/pick', auth(['driver']), (req, res) => {
  db.prepare('UPDATE order_items SET picked = 1 WHERE id = ? AND order_id = ?').run(req.params.itemId, req.params.id);
  io.emit('item-picked', { orderId: parseInt(req.params.id), itemId: parseInt(req.params.itemId) });
  res.json({ success: true });
});

// ============ ORDER CHAT (Driver <-> Customer) ============

app.post('/api/orders/:id/messages', auth(), (req, res) => {
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
const SUPPORT_SYSTEM_PROMPT = `Du bist der freundliche KI-Kundenservice-Assistent von Speeti, einem Lieferdienst in Münster (ähnlich wie Flink/Gorillas).

DEINE AUFGABEN:
- Beantworte Fragen zu Bestellungen, Lieferzeiten, Produkten
- Hilf bei Problemen mit Bestellungen (verspätet, falsche Artikel, etc.)
- Erkläre Rückerstattungen und Stornierungen
- Sei freundlich, hilfsbereit und lösungsorientiert

WICHTIGE INFOS:
- Lieferzeit: ca. 15-20 Minuten
- Liefergebühr: 2,99€
- Liefergebiet: Münster und Umgebung
- Öffnungszeiten: 8:00 - 23:00 Uhr
- Mindestbestellwert: keiner

BEI FOLGENDEN SITUATIONEN ESKALIERE ZU EINEM MENSCHEN (antworte mit [ESKALATION]):
- Kunde ist sehr verärgert/verwendet Schimpfwörter
- Rückerstattung über 20€ gewünscht
- Rechtliche Fragen oder Beschwerden
- Technische Probleme die du nicht lösen kannst
- Kunde fragt explizit nach einem Menschen
- Sicherheitsfragen (Account gehackt, etc.)

Antworte immer auf Deutsch. Sei prägnant aber hilfreich. Maximal 2-3 Sätze pro Antwort.`;

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
  
  res.json({ ticket, messages });
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
  
  // If already escalated, notify admin
  if (ticket.escalated) {
    io.emit('support-message', { ticket_id, sender: 'user', message });
    return res.json({ 
      response: 'Deine Nachricht wurde an unser Support-Team weitergeleitet. Wir melden uns schnellstmöglich bei dir.',
      escalated: true 
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
    // Fallback without OpenAI - basic keyword matching
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('mensch') || lowerMsg.includes('mitarbeiter') || lowerMsg.includes('support')) {
      shouldEscalate = true;
      aiResponse = 'Ich leite dich an einen Mitarbeiter weiter. Bitte warte einen Moment. 🙋‍♂️';
    } else if (lowerMsg.includes('lieferzeit') || lowerMsg.includes('wie lange')) {
      aiResponse = 'Die Lieferung dauert normalerweise 15-20 Minuten. Du kannst den Status deiner Bestellung jederzeit in der App verfolgen! 🚴';
    } else if (lowerMsg.includes('stornieren') || lowerMsg.includes('abbrechen')) {
      aiResponse = 'Um eine Bestellung zu stornieren, gehe zu "Meine Bestellungen" und tippe auf die Bestellung. Falls sie schon in Bearbeitung ist, kontaktiere bitte deinen Fahrer direkt.';
    } else if (lowerMsg.includes('bezahlung') || lowerMsg.includes('zahlung')) {
      aiResponse = 'Wir akzeptieren Barzahlung, Kreditkarte, PayPal, Google Pay, Apple Pay, Klarna und Sofortüberweisung! 💳';
    } else {
      aiResponse = 'Danke für deine Nachricht! Ich bin ein KI-Assistent und helfe dir gerne. Kannst du mir mehr Details geben, damit ich dir besser helfen kann?';
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

// Get all support tickets (admin)
app.get('/api/admin/support', auth(['admin']), (req, res) => {
  const tickets = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email,
           (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id AND sender_type = 'user') as message_count
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
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
app.patch('/api/admin/support/:id/close', auth(['admin']), (req, res) => {
  db.prepare('UPDATE support_tickets SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('closed', req.params.id);
  res.json({ success: true });
});

// ============ STRIPE PAYMENTS ============

// Create checkout session
app.post('/api/checkout/create-session', auth(), async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  }
  
  const { address_id, items, notes } = req.body;
  
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
            images: product.image ? [product.image] : []
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
  
  // Create pending order
  const orderStmt = db.prepare(`INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total, payment_method, payment_status, notes, estimated_delivery) VALUES (?, ?, 'pending', ?, 2.99, ?, 'stripe', 'pending', ?, ?)`);
  const estimated = new Date(Date.now() + 20 * 60000).toISOString();
  const orderResult = orderStmt.run(req.user.id, address_id, subtotal, total, notes || null, estimated);
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
      payment_method_types: ['card', 'klarna', 'sofort', 'paypal'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/orders/${orderId}?success=true`,
      cancel_url: `${req.headers.origin}/checkout?cancelled=true`,
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

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Speeti Backend running on port ${PORT}`);
});
