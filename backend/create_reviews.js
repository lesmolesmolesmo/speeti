const db = require("better-sqlite3")("./speeti.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER,
    order_rating INTEGER CHECK (order_rating BETWEEN 1 AND 5),
    order_comment TEXT,
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    driver_comment TEXT,
    driver_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )
`);

console.log("✅ Reviews table created!");
db.close();
