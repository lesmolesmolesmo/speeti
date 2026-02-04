const db = require("better-sqlite3")("./speeti.db");

const orderNumber = "SPT-" + Date.now();
const now = new Date().toISOString();

// Get admin user
const user = db.prepare("SELECT id, email FROM users WHERE role = ?").get("admin");
if (!user) { console.log("No admin"); process.exit(1); }

// Get or create address
let address = db.prepare("SELECT id FROM addresses WHERE user_id = ?").get(user.id);
if (!address) {
  db.prepare("INSERT INTO addresses (user_id, label, street, house_number, postal_code, city) VALUES (?, ?, ?, ?, ?, ?)").run(
    user.id, "Zuhause", "Hammer Straße", "95", "48153", "Münster"
  );
  address = { id: db.prepare("SELECT last_insert_rowid() as id").get().id };
}

// Create order
const result = db.prepare(
  "INSERT INTO orders (user_id, address_id, order_number, status, subtotal, delivery_fee, total, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
).run(user.id, address.id, orderNumber, "delivered", 34.97, 0, 34.97, "stripe", "paid", now);

const orderId = result.lastInsertRowid;

// Get some product IDs
const products = db.prepare("SELECT id, price FROM products LIMIT 5").all();
products.forEach((p, i) => {
  db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)").run(orderId, p.id, i+1, p.price);
});

console.log("✅ Test order created!");
console.log("Order ID:", orderId);
console.log("Order Number:", orderNumber);
console.log("User Email:", user.email);
console.log("");
console.log("Track: https://speeti.de/track/" + orderNumber);
console.log("Bewertung: https://speeti.de/bewertung/" + orderNumber);

db.close();
