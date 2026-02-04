const fs = require('fs');
const path = '/var/www/speeti/backend/server.js';
let code = fs.readFileSync(path, 'utf8');

// Find and replace the addresses POST route
const oldPattern = /app\.post\('\/api\/addresses', auth\(\), \(req, res\) => \{\s*const \{ label, street, house_number, postal_code, city, instructions, is_default, lat, lng \} = req\.body;[\s\S]*?res\.json\(\{ id: result\.lastInsertRowid, \.\.\.req\.body \}\);\s*\}\);/;

const newRoute = `app.post('/api/addresses', auth(), (req, res) => {
  const { 
    label, street, house_number, postal_code, city, instructions, is_default, lat, lng,
    address_type, doorbell_name, entrance, floor, has_elevator 
  } = req.body;
  
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
  }
  
  const stmt = db.prepare(\`
    INSERT INTO addresses (
      user_id, label, street, house_number, postal_code, city, instructions, is_default, lat, lng,
      address_type, doorbell_name, entrance, floor, has_elevator
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`);
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
});`;

if (oldPattern.test(code)) {
  code = code.replace(oldPattern, newRoute);
  fs.writeFileSync(path, code);
  console.log('✅ Updated addresses POST route');
} else {
  console.log('❌ Pattern not found');
}
