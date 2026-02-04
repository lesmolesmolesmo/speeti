const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "Speeti <noreply@speeti.de>";

// Professionelle, lizenzfreie GIFs
const gifs = {
  confirmed: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
  preparing: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  delivering: "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif",
  delivered: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
  welcome: "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif",
};

// Professional Email Template
function emailTemplate(content, preheader = "") {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Speeti</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; line-height: 1.6; color: #333; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .order-box { background: #fdf2f8; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .order-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(236,72,153,0.1); }
    .order-item:last-child { border-bottom: none; }
    .total-row { display: flex; justify-content: space-between; padding: 16px 0 0 0; border-top: 2px solid #ec4899; margin-top: 8px; }
    .total-row span:last-child { font-size: 24px; font-weight: 700; color: #ec4899; }
    .status-badge { display: inline-block; padding: 10px 20px; border-radius: 50px; font-weight: 600; font-size: 14px; }
    .badge-confirmed { background: #dcfce7; color: #166534; }
    .badge-preparing { background: #fef3c7; color: #92400e; }
    .badge-delivering { background: #dbeafe; color: #1e40af; }
    .badge-delivered { background: #d1fae5; color: #065f46; }
    .gif-container { text-align: center; margin: 24px 0; }
    .gif-container img { max-width: 200px; border-radius: 12px; }
    .info-box { background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .support-box { background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 32px 30px; text-align: center; font-size: 12px; }
    .footer a { color: #d1d5db; text-decoration: none; }
    .footer-links { margin: 16px 0; }
    .footer-links a { margin: 0 12px; }
    .footer-company { margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151; font-size: 11px; color: #6b7280; }
    .auto-email { background: #f9fafb; padding: 12px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>🚴 Speeti</h1>
        <p>Blitzschnelle Lieferung in Münster</p>
      </div>
      <div class="content">
        ${content}
      </div>
      
      <div style="padding: 0 30px 30px 30px;">
        <div style="background:linear-gradient(135deg,#fdf2f8 0%,#f0f9ff 100%);border-radius:16px;padding:28px;text-align:center;border:1px solid #fce7f3;">
          <p style="margin:0 0 6px 0;font-size:24px;">💬</p>
          <h3 style="margin:0 0 8px 0;color:#1f2937;font-size:18px;font-weight:700;">Fragen zu deiner Bestellung?</h3>
          <p style="margin:0 0 24px 0;color:#6b7280;font-size:14px;">Unser Support-Team hilft dir gerne weiter!</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
            <tr>
              <td style="padding:0 6px 12px 6px;">
                <a href="https://speeti.de/support" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:12px 24px;border-radius:10px;min-width:100px;">💬 Live-Chat</a>
              </td>
              <td style="padding:0 6px 12px 6px;">
                <a href="mailto:info@speeti.de" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:12px 24px;border-radius:10px;min-width:100px;">📧 E-Mail</a>
              </td>
              <td style="padding:0 6px 12px 6px;">
                <a href="https://speeti.de/faq" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;padding:12px 24px;border-radius:10px;min-width:100px;">❓ FAQ</a>
              </td>
            </tr>
          </table>
        </div>
      </div>
      
      <div class="footer">
        <div style="font-size:20px;font-weight:700;color:white;margin-bottom:16px;">🚴 Speeti</div>
        <p>Dein Lieferservice für Münster – in 15 Minuten bei dir!</p>
        
        <div class="footer-links">
          <a href="https://speeti.de">Website</a>
          <a href="https://speeti.de/datenschutz">Datenschutz</a>
          <a href="https://speeti.de/impressum">Impressum</a>
          <a href="https://speeti.de/agb">AGB</a>
        </div>
        
        <div class="footer-company">
          <p style="margin:4px 0;"><strong>Speeti GmbH</strong> (i.G.)</p>
          <p style="margin:4px 0;">Musterstraße 123 • 48149 Münster</p>
          <p style="margin:4px 0;">Geschäftsführer: Max Mustermann</p>
          <p style="margin:4px 0;">Handelsregister: AG Münster (in Gründung)</p>
          <p style="margin:4px 0;">USt-IdNr.: DE000000000</p>
        </div>
      </div>
      
      <div class="auto-email">
        Diese E-Mail wurde automatisch erstellt. Bitte antworte nicht direkt auf diese Nachricht.<br>
        Bei Fragen wende dich an <a href="mailto:info@speeti.de" style="color:#ec4899;">info@speeti.de</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️ RESEND_API_KEY not set");
    return { success: false, error: "No API key" };
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: subject,
      html: html,
    });
    
    if (error) {
      console.error("❌ Email error:", error);
      return { success: false, error };
    }
    
    console.log("✅ Email sent to:", to, "ID:", data.id);
    return { success: true, id: data.id };
  } catch (err) {
    console.error("❌ Email exception:", err);
    return { success: false, error: err.message };
  }
}

async function sendOrderConfirmation(order, customer, items) {
  const itemsHtml = items.map(item => `
    <div class="order-item">
      <span style="color:#374151;">${item.quantity}× ${item.name}</span>
      <span style="font-weight:600;color:#1f2937;">${(item.price * item.quantity).toFixed(2)} €</span>
    </div>
  `).join("");
  
  const content = `
    <div class="gif-container">
      <img src="${gifs.confirmed}" alt="Bestellung bestätigt!">
    </div>
    
    <div style="text-align:center;">
      <span class="status-badge badge-confirmed">✅ Bestellung bestätigt</span>
    </div>
    
    <h2 style="text-align:center;margin-top:24px;color:#1f2937;">Vielen Dank für deine Bestellung, ${customer.name || ""}! 🎉</h2>
    
    <p style="text-align:center;color:#4b5563;">
      Wir haben deine Bestellung erhalten und machen uns sofort an die Arbeit. 
      Du erhältst eine weitere E-Mail, sobald dein Fahrer unterwegs ist.
    </p>
    
    <div class="order-box">
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
        <span style="color:#6b7280;">Bestellnummer</span>
        <span style="font-weight:700;color:#ec4899;">#${order.order_number}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#6b7280;">Lieferadresse</span>
        <span style="font-weight:500;color:#1f2937;text-align:right;">${order.address}</span>
      </div>
    </div>
    
    <h3 style="color:#1f2937;margin-bottom:16px;">📦 Deine Bestellung</h3>
    ${itemsHtml}
    <div class="total-row">
      <span style="font-weight:600;color:#374151;">Gesamtsumme</span>
      <span>${order.total.toFixed(2)} €</span>
    </div>
    
    <div style="text-align:center;margin-top:32px;">
      <a href="https://speeti.de/track/${order.order_number}?token=${order.track_token}" class="button">
        📍 Bestellung verfolgen
      </a>
    </div>
    
    <div class="info-box">
      <h3 style="margin:0 0 12px 0;color:#374151;">⚡ Geschätzte Lieferzeit</h3>
      <p style="margin:0;color:#6b7280;"><strong>15-20 Minuten</strong> – Wir beeilen uns!</p>
    </div>
  `;
  
  return sendEmail(
    customer.email,
    `Bestellung #${order.order_number} bestätigt! 🎉`,
    emailTemplate(content, `Danke für deine Bestellung bei Speeti! Lieferung in 15-20 Min.`)
  );
}

async function sendStatusUpdate(order, customer, newStatus) {
  const config = {
    preparing: { 
      emoji: "👨‍🍳", 
      title: "Deine Bestellung wird vorbereitet",
      text: "Unser Team packt gerade alles für dich zusammen. Gleich geht's los!",
      badge: "badge-preparing",
      badgeText: "👨‍🍳 In Zubereitung",
      gif: gifs.preparing
    },
    delivering: { 
      emoji: "🚴", 
      title: "Dein Fahrer ist unterwegs!",
      text: "Halte schon mal das Kleingeld bereit – oder lehn dich zurück, wenn du online bezahlt hast. Dein Fahrer düst durch Münster!",
      badge: "badge-delivering",
      badgeText: "🚴 Unterwegs zu dir",
      gif: gifs.delivering
    },
    delivered: { 
      emoji: "🎉", 
      title: "Guten Appetit!",
      text: "Deine Bestellung wurde erfolgreich zugestellt. Wir hoffen, es schmeckt! Bis zum nächsten Mal 💕",
      badge: "badge-delivered",
      badgeText: "✅ Zugestellt",
      gif: gifs.delivered
    },
  };
  
  const status = config[newStatus] || config.preparing;
  
  const deliveredExtra = newStatus === 'delivered' ? `
    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:18px;color:#1f2937;">⭐ Wie war deine Erfahrung?</p>
      <a href="https://speeti.de/bewertung/${order.order_number}?token=${order.track_token}" class="button" style="background:linear-gradient(135deg,#f59e0b,#d97706);">
        ⭐ Jetzt bewerten
      </a>
    </div>
    <div class="info-box">
      <h3 style="margin:0 0 12px 0;color:#374151;">🎁 Bestell wieder!</h3>
      <p style="margin:0;color:#6b7280;">Nutze Code <strong style="color:#ec4899;">COMEBACK5</strong> für 5% auf deine nächste Bestellung.</p>
    </div>
  ` : `
    <div style="text-align:center;margin-top:24px;">
      <a href="https://speeti.de/track/${order.order_number}?token=${order.track_token}" class="button">
        📍 Live verfolgen
      </a>
    </div>
  `;
  
  const content = `
    <div class="gif-container">
      <img src="${status.gif}" alt="${status.title}">
    </div>
    
    <div style="text-align:center;">
      <span class="status-badge ${status.badge}">${status.badgeText}</span>
    </div>
    
    <h2 style="text-align:center;margin-top:24px;color:#1f2937;">${status.title}</h2>
    
    <p style="text-align:center;font-size:16px;color:#4b5563;">
      ${status.text}
    </p>
    
    <div class="order-box" style="text-align:center;">
      <p style="margin:0;color:#6b7280;">Bestellnummer</p>
      <p style="margin:8px 0 0 0;font-size:24px;font-weight:700;color:#ec4899;">#${order.order_number}</p>
    </div>
    
    ${deliveredExtra}
  `;
  
  return sendEmail(
    customer.email,
    `${status.emoji} Bestellung #${order.order_number}: ${status.badgeText.replace(/[^\w\säöüÄÖÜß]/g, '').trim()}`,
    emailTemplate(content, `${status.title} – Bestellung #${order.order_number}`)
  );
}

async function sendWelcomeEmail(user) {
  const content = `
    <div class="gif-container">
      <img src="${gifs.welcome}" alt="Willkommen!">
    </div>
    
    <h2 style="text-align:center;color:#1f2937;">Willkommen bei Speeti, ${user.name || ""}! 🎉</h2>
    
    <p style="text-align:center;font-size:16px;color:#4b5563;">
      Schön, dass du dabei bist! Ab jetzt bekommst du alles, was du brauchst, 
      in nur 15 Minuten direkt vor deine Tür geliefert.
    </p>
    
    <div style="background:linear-gradient(135deg,#ec4899,#f43f5e);color:white;padding:32px;border-radius:16px;text-align:center;margin:32px 0;">
      <p style="margin:0;font-size:12px;opacity:0.9;">DEIN WILLKOMMENSGESCHENK</p>
      <p style="font-size:40px;font-weight:800;margin:12px 0;letter-spacing:2px;">WELCOME10</p>
      <p style="margin:0;font-size:16px;">10% Rabatt auf deine erste Bestellung!</p>
    </div>
    
    <div style="text-align:center;">
      <a href="https://speeti.de" class="button">
        🛒 Jetzt shoppen
      </a>
    </div>
    
    <div class="info-box">
      <h3 style="margin:0 0 12px 0;color:#374151;">🚀 So funktioniert Speeti</h3>
      <p style="margin:0;color:#6b7280;">1️⃣ Wähle deine Lieblingsprodukte<br>
         2️⃣ Bezahle bequem online oder bar<br>
         3️⃣ Lehn dich zurück – wir sind in 15 Min. da!</p>
    </div>
  `;
  
  return sendEmail(
    user.email,
    "Willkommen bei Speeti! 🚴 Hier ist dein 10% Gutschein",
    emailTemplate(content, "Dein Willkommensgeschenk wartet: 10% Rabatt mit WELCOME10!")
  );
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendStatusUpdate,
  sendWelcomeEmail,
  waitlistEmail: (email, city) => emailTemplate(`<div style="text-align:center;padding:24px 0;"><div style="font-size:64px;margin-bottom:16px;">🚀</div><h1 style="color:#1f2937;margin:0 0 8px 0;">Du bist auf der Warteliste!</h1><p style="color:#6b7280;margin:0;">Wir benachrichtigen dich, sobald Speeti in ${city} startet.</p></div>`, "Du bist auf der Warteliste für Speeti!"),
  emailTemplate,
};
