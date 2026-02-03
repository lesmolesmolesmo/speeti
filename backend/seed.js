const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'speeti.db'));

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  db.prepare(`INSERT OR IGNORE INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)`)
    .run('admin@speeti.de', adminPass, 'Admin', '+49 251 123456', 'admin');

  // Create test driver
  const driverPass = await bcrypt.hash('fahrer123', 10);
  db.prepare(`INSERT OR IGNORE INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)`)
    .run('fahrer@speeti.de', driverPass, 'Max Fahrer', '+49 251 654321', 'driver');

  // Create categories
  const categories = [
    { name: 'Obst & Gemüse', slug: 'obst-gemuese', icon: '🥬', color: '#22C55E' },
    { name: 'Milch & Käse', slug: 'milch-kaese', icon: '🧀', color: '#FBBF24' },
    { name: 'Fleisch & Wurst', slug: 'fleisch-wurst', icon: '🥩', color: '#EF4444' },
    { name: 'Brot & Backwaren', slug: 'brot-backwaren', icon: '🥖', color: '#D97706' },
    { name: 'Getränke', slug: 'getraenke', icon: '🥤', color: '#3B82F6' },
    { name: 'Snacks & Süßes', slug: 'snacks-suesses', icon: '🍫', color: '#8B5CF6' },
    { name: 'Tiefkühl', slug: 'tiefkuehl', icon: '🧊', color: '#06B6D4' },
    { name: 'Haushalt', slug: 'haushalt', icon: '🧹', color: '#EC4899' },
    { name: 'Drogerie', slug: 'drogerie', icon: '🧴', color: '#14B8A6' },
    { name: 'Baby & Kind', slug: 'baby-kind', icon: '👶', color: '#F472B6' }
  ];

  const catStmt = db.prepare('INSERT OR IGNORE INTO categories (name, slug, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)');
  categories.forEach((cat, i) => catStmt.run(cat.name, cat.slug, cat.icon, cat.color, i));

  // Get category IDs
  const getCatId = (slug) => db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)?.id;

  // Create products
  const products = [
    // Obst & Gemüse
    { cat: 'obst-gemuese', name: 'Bio Bananen', price: 1.99, unit: 'Bund', desc: 'Aus fairem Handel, ca. 5 Stück' },
    { cat: 'obst-gemuese', name: 'Äpfel Elstar', price: 2.49, unit: 'kg', desc: 'Knackig & süß' },
    { cat: 'obst-gemuese', name: 'Tomaten', price: 2.99, unit: '500g', desc: 'Strauchreif geerntet' },
    { cat: 'obst-gemuese', name: 'Gurke', price: 0.89, unit: 'Stück', desc: 'Frisch & knackig' },
    { cat: 'obst-gemuese', name: 'Paprika Mix', price: 2.99, unit: '500g', desc: 'Rot, Gelb, Grün' },
    { cat: 'obst-gemuese', name: 'Avocado', price: 1.49, unit: 'Stück', desc: 'Reif & cremig' },
    { cat: 'obst-gemuese', name: 'Zitronen Bio', price: 0.59, unit: 'Stück', desc: 'Unbehandelte Schale' },
    { cat: 'obst-gemuese', name: 'Karotten', price: 1.29, unit: '1kg', desc: 'Knackig & frisch' },
    
    // Milch & Käse
    { cat: 'milch-kaese', name: 'Vollmilch 3,5%', price: 1.29, unit: '1L', desc: 'Frische Weidemilch' },
    { cat: 'milch-kaese', name: 'Gouda jung', price: 2.49, unit: '200g', desc: 'Mild & cremig' },
    { cat: 'milch-kaese', name: 'Butter', price: 2.29, unit: '250g', desc: 'Deutsche Markenbutter' },
    { cat: 'milch-kaese', name: 'Joghurt Natur', price: 0.99, unit: '500g', desc: 'Cremig gerührt' },
    { cat: 'milch-kaese', name: 'Mozzarella', price: 1.49, unit: '125g', desc: 'Italienischer Klassiker' },
    { cat: 'milch-kaese', name: 'Sahne', price: 1.19, unit: '200g', desc: 'Zum Kochen & Schlagen' },
    { cat: 'milch-kaese', name: 'Frischkäse', price: 1.29, unit: '200g', desc: 'Natur, streichzart' },
    
    // Fleisch & Wurst
    { cat: 'fleisch-wurst', name: 'Hähnchenbrust', price: 5.99, unit: '400g', desc: 'Frisch, ohne Haut' },
    { cat: 'fleisch-wurst', name: 'Hackfleisch gemischt', price: 4.99, unit: '500g', desc: 'Rind & Schwein' },
    { cat: 'fleisch-wurst', name: 'Wiener Würstchen', price: 2.49, unit: '6 Stück', desc: 'Klassiker' },
    { cat: 'fleisch-wurst', name: 'Salami', price: 2.29, unit: '100g', desc: 'Fein geschnitten' },
    { cat: 'fleisch-wurst', name: 'Schinken gekocht', price: 2.99, unit: '150g', desc: 'Zart & mild' },
    
    // Brot & Backwaren
    { cat: 'brot-backwaren', name: 'Vollkornbrot', price: 2.49, unit: '500g', desc: 'Frisch gebacken' },
    { cat: 'brot-backwaren', name: 'Brötchen', price: 0.39, unit: 'Stück', desc: 'Knusprig & frisch' },
    { cat: 'brot-backwaren', name: 'Croissant', price: 0.99, unit: 'Stück', desc: 'Buttrig & fluffig' },
    { cat: 'brot-backwaren', name: 'Toastbrot', price: 1.49, unit: '500g', desc: 'Buttertoast' },
    { cat: 'brot-backwaren', name: 'Laugenstange', price: 0.79, unit: 'Stück', desc: 'Bayerischer Klassiker' },
    
    // Getränke
    { cat: 'getraenke', name: 'Coca-Cola', price: 1.49, unit: '1L', desc: 'Das Original', featured: true },
    { cat: 'getraenke', name: 'Mineralwasser', price: 0.69, unit: '1,5L', desc: 'Classic oder Still' },
    { cat: 'getraenke', name: 'Orangensaft', price: 1.99, unit: '1L', desc: '100% Direktsaft' },
    { cat: 'getraenke', name: 'Bier Pils', price: 0.89, unit: '0,5L', desc: 'Frisch gezapft' },
    { cat: 'getraenke', name: 'Red Bull', price: 1.79, unit: '250ml', desc: 'Energy Drink', featured: true },
    { cat: 'getraenke', name: 'Apfelschorle', price: 1.29, unit: '1L', desc: 'Erfrischend' },
    
    // Snacks & Süßes
    { cat: 'snacks-suesses', name: 'Chips Paprika', price: 1.99, unit: '175g', desc: 'Knusprig gewürzt', featured: true },
    { cat: 'snacks-suesses', name: 'Milka Schokolade', price: 1.29, unit: '100g', desc: 'Alpenmilch', featured: true },
    { cat: 'snacks-suesses', name: 'Gummibärchen', price: 1.49, unit: '200g', desc: 'Haribo Goldbären' },
    { cat: 'snacks-suesses', name: 'Kekse', price: 1.79, unit: '200g', desc: 'Butter Cookies' },
    { cat: 'snacks-suesses', name: 'Nüsse Mix', price: 2.99, unit: '150g', desc: 'Gesalzen' },
    { cat: 'snacks-suesses', name: 'Eis Ben & Jerry\'s', price: 5.99, unit: '465ml', desc: 'Cookie Dough', featured: true },
    
    // Tiefkühl
    { cat: 'tiefkuehl', name: 'Pizza Margherita', price: 2.99, unit: 'Stück', desc: 'Steinofen' },
    { cat: 'tiefkuehl', name: 'Pommes Frites', price: 2.49, unit: '750g', desc: 'Knusprig im Ofen' },
    { cat: 'tiefkuehl', name: 'Fischstäbchen', price: 2.99, unit: '10 Stück', desc: 'Aus Seelachs' },
    { cat: 'tiefkuehl', name: 'Spinat', price: 1.49, unit: '450g', desc: 'Rahmspinat' },
    { cat: 'tiefkuehl', name: 'Chicken Nuggets', price: 3.49, unit: '250g', desc: 'Knusprig paniert' },
    
    // Haushalt
    { cat: 'haushalt', name: 'Toilettenpapier', price: 3.99, unit: '8 Rollen', desc: '3-lagig, soft' },
    { cat: 'haushalt', name: 'Küchentücher', price: 2.49, unit: '2 Rollen', desc: 'Extra saugstark' },
    { cat: 'haushalt', name: 'Spülmittel', price: 1.29, unit: '500ml', desc: 'Fettlösend' },
    { cat: 'haushalt', name: 'Müllbeutel', price: 1.99, unit: '20 Stück', desc: '60 Liter' },
    { cat: 'haushalt', name: 'Alufolie', price: 1.49, unit: '10m', desc: 'Reißfest' },
    
    // Drogerie
    { cat: 'drogerie', name: 'Shampoo', price: 2.49, unit: '250ml', desc: 'Für alle Haartypen' },
    { cat: 'drogerie', name: 'Duschgel', price: 1.99, unit: '300ml', desc: 'Erfrischend' },
    { cat: 'drogerie', name: 'Zahnpasta', price: 1.29, unit: '75ml', desc: 'Frischer Atem' },
    { cat: 'drogerie', name: 'Deo', price: 2.49, unit: '150ml', desc: '48h Schutz' },
    { cat: 'drogerie', name: 'Handseife', price: 1.19, unit: '500ml', desc: 'Antibakteriell' },
    
    // Baby & Kind
    { cat: 'baby-kind', name: 'Windeln Pampers', price: 12.99, unit: '44 Stück', desc: 'Größe 4' },
    { cat: 'baby-kind', name: 'Babybrei', price: 0.99, unit: '190g', desc: 'Karotte' },
    { cat: 'baby-kind', name: 'Feuchttücher', price: 1.99, unit: '80 Stück', desc: 'Sensitiv' },
    { cat: 'baby-kind', name: 'Kindermilch', price: 2.49, unit: '1L', desc: 'Ab 1 Jahr' }
  ];

  const prodStmt = db.prepare(`
    INSERT OR IGNORE INTO products (category_id, name, description, price, unit, featured) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  products.forEach(p => {
    const catId = getCatId(p.cat);
    if (catId) {
      prodStmt.run(catId, p.name, p.desc || null, p.price, p.unit || 'Stück', p.featured ? 1 : 0);
    }
  });

  // Store settings
  const settings = [
    ['store_name', 'Speeti'],
    ['store_tagline', 'Blitzschnell bei dir in Münster'],
    ['delivery_fee', '2.99'],
    ['min_order', '10.00'],
    ['delivery_time', '15-20'],
    ['delivery_area', 'Münster'],
    ['store_phone', '+49 251 123456'],
    ['store_email', 'hallo@speeti.de'],
    ['opening_hours', '08:00-22:00'],
    ['primary_color', '#14B8A6'],
    ['accent_color', '#8B5CF6']
  ];

  const settingStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  settings.forEach(([key, value]) => settingStmt.run(key, value));

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📧 Admin Login: admin@speeti.de / admin123');
  console.log('🚗 Fahrer Login: fahrer@speeti.de / fahrer123');
}

seed().catch(console.error);
