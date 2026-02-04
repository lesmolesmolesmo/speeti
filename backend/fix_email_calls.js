const fs = require("fs");
const path = "/var/www/speeti/backend/server.js";
let code = fs.readFileSync(path, "utf8");

// Replace the old sendOrderEmails function with the new one
const oldFunc = `// Helper function to send order emails
async function sendOrderEmails(orderId, status) {
  try {
    const order = db.prepare(\`
      SELECT o.*, u.email, u.name as customer_name, 
             a.street, a.house_number, a.postal_code, a.city
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    \`).get(orderId);
    
    if (!order || !order.email) return;
    
    const items = db.prepare(\`
      SELECT oi.*, p.name, p.image FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    \`).all(orderId);
    
    let subject, html;
    if (status === confirmed) {
      subject = \`Bestellung #\${orderId} bestätigt! 🎉\`;
      html = emailService.orderConfirmationEmail(order, items);
    } else if ([preparing, picking, delivering, delivered].includes(status)) {
      const titles = {
        preparing: Wird vorbereitet 👨🍳,
        picking: Wird gepackt 📦,
        delivering: Unterwegs zu dir! 🛵,
        delivered: Geliefert! 🎉
      };
      subject = \`Bestellung #\${orderId}: \${titles[status]}\`;
      html = emailService.deliveryStatusEmail(order, status);
    }
    
    if (subject && html) {
      emailService.sendEmail(order.email, subject, html);
    }
  } catch (e) {
    console.error(Email error:, e);
  }
}`;

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
    console.error(❌ Email error:, e);
  }
}`;

if (code.includes(oldFunc)) {
  code = code.replace(oldFunc, newFunc);
  fs.writeFileSync(path, code);
  console.log("✅ Updated sendOrderEmails function");
} else {
  console.log("❌ Old function not found exactly, trying partial match...");
  // Try to find and show what exists
  const match = code.match(/\/\/ Helper function to send order emails[\s\S]*?console\.error\(Email error:, e\);\s*\}\s*\}/);
  if (match) {
    console.log("Found function, length:", match[0].length);
  }
}
