const fs = require("fs");
const path = "/var/www/speeti/backend/server.js";
let code = fs.readFileSync(path, "utf8");

// Find and replace using regex
const regex = /\/\/ Helper function to send order emails[\s\S]*?console\.error\([']Email error:['], e\);\s*\}\s*\}/;

const newFunc = `// Helper function to send order emails (Resend)
async function sendOrderEmails(orderId, status) {
  try {
    const order = db.prepare(\`
      SELECT o.*, o.order_number, u.email, u.name as customer_name, 
             a.street, a.house_number, a.postal_code, a.city
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    \`).get(orderId);
    
    if (!order || !order.email) {
      console.log("⚠️ No email for order", orderId);
      return;
    }
    
    const items = db.prepare(\`
      SELECT oi.*, p.name, p.image FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    \`).all(orderId);
    
    const orderData = {
      order_number: order.order_number || orderId,
      total: order.total,
      address: \`\${order.street} \${order.house_number}, \${order.postal_code} \${order.city}\`
    };
    
    const customer = { email: order.email, name: order.customer_name };
    
    if (status === confirmed) {
      await emailService.sendOrderConfirmation(orderData, customer, items);
      console.log("📧 Order confirmation sent to:", order.email);
    } else if ([preparing, delivering, delivered].includes(status)) {
      await emailService.sendStatusUpdate(orderData, customer, status);
      console.log("📧 Status update sent to:", order.email);
    }
  } catch (e) {
    console.error("❌ Email error:", e);
  }
}`;

if (regex.test(code)) {
  code = code.replace(regex, newFunc);
  fs.writeFileSync(path, code);
  console.log("✅ Updated sendOrderEmails function");
} else {
  console.log("❌ Function not found with regex");
}
