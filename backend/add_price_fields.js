const Database = require("better-sqlite3");
const db = new Database("/var/www/speeti/backend/speeti.db");

// Add columns
const cols = [
  "ALTER TABLE products ADD COLUMN deposit REAL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN unit_amount REAL",
  "ALTER TABLE products ADD COLUMN unit_type TEXT DEFAULT 'stück'"
];

cols.forEach(sql => {
  try { db.exec(sql); console.log("✅", sql.split(" ")[4]); } 
  catch(e) { if(!e.message.includes("duplicate")) throw e; else console.log("⏭️ exists"); }
});

// Update products
const updates = [
  ["%Cola%", 0.25, 330, "ml"],
  ["%Fanta%", 0.25, 330, "ml"],
  ["%Sprite%", 0.25, 330, "ml"],
  ["%Wasser%", 0.25, 500, "ml"],
  ["%Bier%", 0.08, 500, "ml"],
  ["%Red Bull%", 0.25, 250, "ml"],
  ["%Milch%", 0.25, 1000, "ml"],
  ["%Chips%", 0, 175, "g"],
  ["%Pringles%", 0, 200, "g"],
  ["%Haribo%", 0, 200, "g"],
  ["%Schokolade%", 0, 100, "g"],
  ["%Eis%", 0, 500, "ml"],
  ["%Hundefutter%", 0, 800, "g"],
];

const stmt = db.prepare("UPDATE products SET deposit=?, unit_amount=?, unit_type=? WHERE name LIKE ?");
updates.forEach(([pat,dep,amt,type]) => {
  const r = stmt.run(dep, amt, type, pat);
  if(r.changes) console.log("📦", r.changes, "x", pat);
});

console.log("\n✅ Done!");
db.close();
