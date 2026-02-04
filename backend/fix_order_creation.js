const fs = require("fs");
const code = fs.readFileSync("/var/www/speeti/backend/server.js", "utf8");

// Add crypto require if not present
let newCode = code;
if (!code.includes("require(\x27crypto\x27)")) {
  newCode = newCode.replace(
    "const sharp = require(\"sharp\");",
    "const sharp = require(\"sharp\");\nconst crypto = require(\"crypto\");"
  );
}

// Add helper function after emailService require
const helperFunc = `
// Generate order number and tracking token
function generateOrderDetails() {
  const orderNumber = "SPT-" + Date.now();
  const trackToken = crypto.randomBytes(16).toString("hex");
  return { orderNumber, trackToken };
}
`;

if (!newCode.includes("generateOrderDetails")) {
  newCode = newCode.replace(
    "const emailService = require(\"./email-service\");",
    "const emailService = require(\"./email-service\");" + helperFunc
  );
}

// Update first INSERT (cash/card orders)
newCode = newCode.replace(
  "const orderStmt = db.prepare(\`INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total, payment_method, notes, estimated_delivery, scheduled_time) VALUES (?, ?, \x27confirmed\x27, ?, ?, ?, ?, ?, ?, ?)\`);",
  "const { orderNumber, trackToken } = generateOrderDetails();\n  const orderStmt = db.prepare(\`INSERT INTO orders (user_id, address_id, order_number, track_token, status, subtotal, delivery_fee, total, payment_method, notes, estimated_delivery, scheduled_time) VALUES (?, ?, ?, ?, \x27confirmed\x27, ?, ?, ?, ?, ?, ?, ?)\`);"
);

newCode = newCode.replace(
  "const orderResult = orderStmt.run(req.user.id, address_id, subtotal, delivery_fee, total, payment_method || \x27cash\x27, notes || null, estimated, scheduled_time || null);",
  "const orderResult = orderStmt.run(req.user.id, address_id, orderNumber, trackToken, subtotal, delivery_fee, total, payment_method || \x27cash\x27, notes || null, estimated, scheduled_time || null);"
);

// Update second INSERT (Stripe orders)  
newCode = newCode.replace(
  "const orderStmt = db.prepare(\`INSERT INTO orders (user_id, address_id, status, subtotal, delivery_fee, total, payment_method, payment_status, notes, estimated_delivery, scheduled_time) VALUES (?, ?, \x27pending\x27, ?, 2.99, ?, \x27stripe\x27, \x27pending\x27, ?, ?, ?)\`);",
  "const { orderNumber: stripeOrderNum, trackToken: stripeTrackToken } = generateOrderDetails();\n  const orderStmt = db.prepare(\`INSERT INTO orders (user_id, address_id, order_number, track_token, status, subtotal, delivery_fee, total, payment_method, payment_status, notes, estimated_delivery, scheduled_time) VALUES (?, ?, ?, ?, \x27pending\x27, ?, 2.99, ?, \x27stripe\x27, \x27pending\x27, ?, ?, ?)\`);"
);

fs.writeFileSync("/var/www/speeti/backend/server.js", newCode);
console.log("✅ Order creation updated with order_number and track_token!");
