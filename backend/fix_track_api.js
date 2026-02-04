const fs = require("fs");
const path = "/var/www/speeti/backend/server.js";
let code = fs.readFileSync(path, "utf8");

// Find the track endpoint and replace it
const startMarker = "app.get(\x27/api/track/:orderNumber\x27";
const endMarker = "// ================================================\n// ADMIN SETTINGS";

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log("Markers not found", startIdx, endIdx);
  process.exit(1);
}

const newEndpoint = `app.get(\x27/api/track/:orderNumber\x27, (req, res) => {
  try {
    const orderNum = req.params.orderNumber.replace(\x27SPEETI-\x27, \x27\x27).replace(/^0+/, \x27\x27);
    const { token, email } = req.query;
    
    const order = db.prepare(\x60
      SELECT 
        o.id, o.order_number, o.track_token, o.status, o.total, o.delivery_fee, 
        o.created_at, o.scheduled_time,
        a.street, a.house_number, a.postal_code as plz, a.city,
        u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ? OR o.order_number = ? OR CAST(o.id AS TEXT) LIKE \x27%\x27 || ? || \x27%\x27
      LIMIT 1
    \x60).get(orderNum, orderNum, orderNum);
    
    if (!order) {
      return res.status(404).json({ error: \x27Bestellung nicht gefunden\x27 });
    }
    
    // Security: require token OR matching email
    const isValidToken = token && order.track_token && token === order.track_token;
    const isValidEmail = email && order.customer_email && 
                         email.toLowerCase() === order.customer_email.toLowerCase();
    
    if (!isValidToken && !isValidEmail) {
      return res.json({
        orderNumber: order.order_number || (\x27SPEETI-\x27 + String(order.id).padStart(5, \x270\x27)),
        requiresVerification: true,
        message: \x27Bitte gib deine E-Mail-Adresse ein, um die Bestellung zu verifizieren.\x27
      });
    }
    
    const items = db.prepare(\x60
      SELECT oi.quantity, oi.price, p.name, p.image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    \x60).all(order.id);
    
    const statusTimeline = {
      pending: { step: 1, label: \x27Bestellung eingegangen\x27, icon: \x27📋\x27 },
      confirmed: { step: 2, label: \x27Bestellung bestätigt\x27, icon: \x27✅\x27 },
      preparing: { step: 3, label: \x27Wird vorbereitet\x27, icon: \x27👨🍳\x27 },
      ready: { step: 4, label: \x27Bereit zur Auslieferung\x27, icon: \x27📦\x27 },
      delivering: { step: 5, label: \x27Auf dem Weg\x27, icon: \x27🚴\x27 },
      delivered: { step: 6, label: \x27Geliefert\x27, icon: \x27🎉\x27 },
      cancelled: { step: 0, label: \x27Storniert\x27, icon: \x27❌\x27 }
    };
    
    const currentStatus = statusTimeline[order.status] || statusTimeline.pending;
    
    res.json({
      verified: true,
      orderNumber: order.order_number || (\x27SPEETI-\x27 + String(order.id).padStart(5, \x270\x27)),
      status: order.status,
      statusInfo: currentStatus,
      total: order.total,
      deliveryFee: order.delivery_fee,
      address: { street: order.street, houseNumber: order.house_number, plz: order.plz, city: order.city },
      customerName: order.customer_name?.split(\x27 \x27)[0] || \x27Kunde\x27,
      items,
      createdAt: order.created_at,
      scheduledTime: order.scheduled_time,
      timeline: Object.entries(statusTimeline)
        .filter(([key]) => key !== \x27cancelled\x27)
        .map(([key, val]) => ({
          status: key, ...val,
          completed: val.step <= currentStatus.step && order.status !== \x27cancelled\x27,
          current: key === order.status
        }))
    });
  } catch (err) {
    console.error(\x27Track error:\x27, err);
    res.status(500).json({ error: \x27Fehler beim Laden\x27 });
  }
});

`;

code = code.substring(0, startIdx) + newEndpoint + code.substring(endIdx);
fs.writeFileSync(path, code);
console.log("✅ Track API updated with security!");
