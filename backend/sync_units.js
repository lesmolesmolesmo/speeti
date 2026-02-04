const db = require('better-sqlite3')('./speeti.db');

// Sync unit → unit_type based on unit value
db.exec("UPDATE products SET unit_type = 'ml' WHERE unit = 'ml'");
db.exec("UPDATE products SET unit_type = 'l' WHERE unit = 'Liter' OR unit = 'l'");
db.exec("UPDATE products SET unit_type = 'g' WHERE unit = 'g'");
db.exec("UPDATE products SET unit_type = 'kg' WHERE unit = 'kg'");

// Also sync based on name patterns
db.exec("UPDATE products SET unit_type = 'ml' WHERE name LIKE '%ml%' AND unit_type IS NULL");
db.exec("UPDATE products SET unit_type = 'g' WHERE name LIKE '%g %' OR name LIKE '%g' AND unit_type IS NULL");

console.log('✅ unit_type synced!');

// Show examples
const examples = db.prepare('SELECT name, unit, unit_amount, unit_type FROM products WHERE unit_type IS NOT NULL LIMIT 10').all();
examples.forEach(p => console.log(' ', p.name.substring(0,30), '|', p.unit_amount, p.unit_type));

db.close();
