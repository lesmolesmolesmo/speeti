const Database = require('better-sqlite3');
const db = new Database('/var/www/speeti/backend/speeti.db');

// Sample products per category
const productData = {
  // Milch & Käse (2)
  'milch-kaese': [
    { name: 'Vollmilch 3,5%', price: 1.29, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop' },
    { name: 'Gouda Jung', price: 2.49, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop' },
    { name: 'Griechischer Joghurt', price: 1.99, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop' },
    { name: 'Butter 250g', price: 2.79, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop' },
  ],
  // Fleisch & Wurst (3)
  'fleisch-wurst': [
    { name: 'Hähnchenbrust 400g', price: 4.99, image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop' },
    { name: 'Rinderhackfleisch 500g', price: 5.49, image: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400&h=400&fit=crop' },
    { name: 'Salami geschnitten', price: 2.29, image: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400&h=400&fit=crop' },
  ],
  // Brot & Backwaren (4)
  'brot-backwaren': [
    { name: 'Vollkornbrot 500g', price: 2.49, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop' },
    { name: 'Croissants 4er', price: 2.99, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop' },
    { name: 'Baguette', price: 1.49, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop' },
    { name: 'Toastbrot', price: 1.29, image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&h=400&fit=crop' },
  ],
  // Wasser (11)
  'wasser': [
    { name: 'Mineralwasser Still 1,5L', price: 0.79, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop' },
    { name: 'Mineralwasser Medium 1,5L', price: 0.79, image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&h=400&fit=crop' },
    { name: 'Mineralwasser Sprudel 1,5L', price: 0.79, image: 'https://images.unsplash.com/photo-1606168094336-48f205276929?w=400&h=400&fit=crop' },
  ],
  // Softdrinks & Cola (12)
  'softdrinks': [
    { name: 'Coca Cola 1L', price: 1.49, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop' },
    { name: 'Fanta Orange 1L', price: 1.49, image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=400&fit=crop' },
    { name: 'Sprite 1L', price: 1.49, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop' },
    { name: 'Pepsi 1L', price: 1.39, image: 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=400&h=400&fit=crop' },
  ],
  // Energy Drinks (14)
  'energy-drinks': [
    { name: 'Red Bull 250ml', price: 1.79, image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&h=400&fit=crop' },
    { name: 'Monster Energy 500ml', price: 1.99, image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=400&fit=crop' },
    { name: 'Rockstar Energy 500ml', price: 1.89, image: 'https://images.unsplash.com/photo-1613577880507-f1e65c860761?w=400&h=400&fit=crop' },
  ],
  // Bier (15)
  'bier': [
    { name: 'Krombacher Pils 0,5L', price: 1.29, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop' },
    { name: 'Beck\'s 0,5L', price: 1.19, image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop' },
    { name: 'Corona Extra 0,33L', price: 1.79, image: 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=400&h=400&fit=crop' },
    { name: 'Heineken 0,5L', price: 1.49, image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400&h=400&fit=crop' },
  ],
  // Wein & Sekt (16)
  'wein-sekt': [
    { name: 'Rotwein Merlot 0,75L', price: 5.99, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop' },
    { name: 'Weißwein Riesling 0,75L', price: 6.49, image: 'https://images.unsplash.com/photo-1566754436949-9b34f7d6e058?w=400&h=400&fit=crop' },
    { name: 'Prosecco 0,75L', price: 4.99, image: 'https://images.unsplash.com/photo-1578911373434-0cb395d2cbfb?w=400&h=400&fit=crop' },
  ],
  // Kaffee (18)
  'kaffee': [
    { name: 'Filterkaffee 500g', price: 4.99, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop' },
    { name: 'Espresso Bohnen 250g', price: 5.99, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop' },
    { name: 'Instant Kaffee 200g', price: 6.49, image: 'https://images.unsplash.com/photo-1497515114889-e93a5c0e3055?w=400&h=400&fit=crop' },
  ],
  // Chips & Knabbereien (31)
  'chips-knabbereien': [
    { name: 'Lay\'s Classic 175g', price: 2.29, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop' },
    { name: 'Pringles Original', price: 2.49, image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400&h=400&fit=crop' },
    { name: 'Erdnüsse gesalzen 200g', price: 1.99, image: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400&h=400&fit=crop' },
    { name: 'Nachos Cheese 200g', price: 2.19, image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=400&fit=crop' },
  ],
  // Schokolade (32)
  'schokolade': [
    { name: 'Milka Alpenmilch 100g', price: 1.49, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=400&fit=crop' },
    { name: 'Lindt Excellence 70%', price: 2.99, image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&h=400&fit=crop' },
    { name: 'Kinder Schokolade 8er', price: 2.29, image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=400&h=400&fit=crop' },
  ],
  // Süßigkeiten (33)
  'suessigkeiten': [
    { name: 'Haribo Goldbären 200g', price: 1.29, image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&h=400&fit=crop' },
    { name: 'M&M\'s Peanut 200g', price: 2.49, image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400&h=400&fit=crop' },
    { name: 'Skittles 160g', price: 1.99, image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop' },
  ],
  // Nudeln & Reis (22)
  'nudeln-reis': [
    { name: 'Spaghetti 500g', price: 0.99, image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop' },
    { name: 'Basmati Reis 1kg', price: 2.99, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop' },
    { name: 'Penne Rigate 500g', price: 1.19, image: 'https://images.unsplash.com/photo-1603729362753-f8162ac6c3df?w=400&h=400&fit=crop' },
  ],
  // Haushalt (8)
  'haushalt': [
    { name: 'Küchenrolle 4er Pack', price: 3.49, image: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&h=400&fit=crop' },
    { name: 'Spülmittel 500ml', price: 1.49, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop' },
    { name: 'Müllbeutel 30L 20er', price: 2.99, image: 'https://images.unsplash.com/photo-1610141567037-10b68281f97d?w=400&h=400&fit=crop' },
  ],
  // Tiernahrung (40)
  'tiernahrung': [
    { name: 'Katzenfutter 400g', price: 1.29, image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop' },
    { name: 'Hundefutter 800g', price: 2.49, image: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&h=400&fit=crop' },
    { name: 'Katzensnacks', price: 1.99, image: 'https://images.unsplash.com/photo-1615497001839-b0a0eac3274c?w=400&h=400&fit=crop' },
  ],
};

// Get all categories
const categories = db.prepare('SELECT id, slug FROM categories WHERE active = 1').all();
console.log(`Found ${categories.length} active categories`);

// Insert products
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO products (name, price, image, category_id, active, created_at)
  VALUES (?, ?, ?, ?, 1, datetime('now'))
`);

let added = 0;
for (const cat of categories) {
  const products = productData[cat.slug];
  if (products) {
    for (const p of products) {
      const result = insertStmt.run(p.name, p.price, p.image, cat.id);
      if (result.changes > 0) {
        added++;
        console.log(`✓ Added: ${p.name} to ${cat.slug}`);
      }
    }
  }
}

// Also add some generic products to categories without specific products
const genericProducts = [
  { name: 'Produkt A', price: 2.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop' },
  { name: 'Produkt B', price: 3.49, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
  { name: 'Produkt C', price: 1.99, image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop' },
];

// Check which categories have no products
for (const cat of categories) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE category_id = ?').get(cat.id);
  if (count.cnt === 0) {
    console.log(`Adding generic products to: ${cat.slug}`);
    for (const p of genericProducts) {
      insertStmt.run(`${p.name} (${cat.slug})`, p.price, p.image, cat.id);
      added++;
    }
  }
}

console.log(`\n✅ Total products added: ${added}`);

// Show summary
const totalProducts = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE active = 1').get();
console.log(`📦 Total active products: ${totalProducts.cnt}`);
