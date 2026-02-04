const nodemailer = require('nodemailer');

// Email transporter (configure with your SMTP)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'speeti.delivery@gmail.com',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

// Animated GIFs for emails
const emailAssets = {
  deliveryGif: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',
  confirmGif: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  cookingGif: 'https://media.giphy.com/media/3o7TKUn3XtBLmNFqko/giphy.gif',
  rocketGif: 'https://media.giphy.com/media/3o7aD4GrHwn8vsGBTa/giphy.gif',
  partyGif: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
};

// Base email template
function emailTemplate(content, preheader = '') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Speeti</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #F43F5E 0%, #EC4899 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: white; margin: 15px 0 0; font-size: 28px; }
    .content { padding: 30px 25px; }
    .gif-container { text-align: center; margin: 20px 0; }
    .gif-container img { max-width: 200px; border-radius: 12px; }
    .status-badge { display: inline-block; padding: 8px 20px; border-radius: 50px; font-weight: 600; font-size: 14px; }
    .status-confirmed { background: #DBEAFE; color: #1D4ED8; }
    .status-preparing { background: #FEF3C7; color: #D97706; }
    .status-delivering { background: #D1FAE5; color: #059669; }
    .status-delivered { background: #ECFDF5; color: #047857; }
    .order-box { background: #F9FAFB; border-radius: 16px; padding: 20px; margin: 20px 0; }
    .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB; }
    .order-item:last-child { border-bottom: none; }
    .total-row { font-size: 18px; font-weight: 700; color: #F43F5E; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #F43F5E 0%, #EC4899 100%); color: white !important; padding: 14px 35px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #1F2937; color: #9CA3AF; padding: 30px 20px; text-align: center; font-size: 13px; }
    .footer a { color: #F43F5E; text-decoration: none; }
    .address-box { background: #FDF2F8; border-radius: 12px; padding: 15px; margin: 15px 0; }
    .timeline { margin: 25px 0; }
    .timeline-item { display: flex; align-items: flex-start; margin-bottom: 15px; }
    .timeline-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 15px; margin-top: 4px; }
    .timeline-dot.active { background: #F43F5E; }
    .timeline-dot.done { background: #10B981; }
    .timeline-dot.pending { background: #D1D5DB; }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <div class="container">
    <div class="header">
      <div style="font-size: 36px;">⚡</div>
      <h1>Speeti</h1>
    </div>
    ${content}
    <div class="footer">
      <p style="margin-bottom: 15px;">Made with ❤️ in Münster</p>
      <p style="margin-top: 20px; font-size: 11px; color: #6B7280;">
        Speeti · Münster, Deutschland<br>
        <a href="https://speeti.de/datenschutz">Datenschutz</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Order confirmation email
function orderConfirmationEmail(order, items) {
  const itemsHtml = items.map(item => `
    <div class="order-item">
      <span>${item.quantity}x ${item.name}</span>
      <span>${(item.price * item.quantity).toFixed(2)} €</span>
    </div>
  `).join('');
  
  const subtotal = (order.total - (order.delivery_fee || 2.99)).toFixed(2);
  
  return emailTemplate(`
    <div class="content">
      <div class="gif-container">
        <img src="${emailAssets.confirmGif}" alt="Bestätigt!" />
      </div>
      
      <h2 style="text-align: center; color: #1F2937; margin-bottom: 5px;">Bestellung bestätigt! 🎉</h2>
      <p style="text-align: center; color: #6B7280;">Bestellung #${order.id} · ${new Date(order.created_at).toLocaleDateString('de-DE')}</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <span class="status-badge status-confirmed">✓ Bestätigt</span>
      </div>
      
      <p style="color: #4B5563;">Hi ${order.customer_name}! 👋</p>
      <p style="color: #4B5563;">Deine Bestellung ist eingegangen und wird jetzt vorbereitet. Du erhältst eine weitere E-Mail, sobald dein Fahrer unterwegs ist!</p>
      
      <div class="order-box">
        <h3 style="margin-top: 0; color: #1F2937;">📦 Deine Bestellung</h3>
        ${itemsHtml}
        <div style="border-top: 2px solid #E5E7EB; margin-top: 15px; padding-top: 15px;">
          <div class="order-item">
            <span>Zwischensumme</span>
            <span>${subtotal} €</span>
          </div>
          <div class="order-item">
            <span>Lieferung</span>
            <span>${(order.delivery_fee || 2.99).toFixed(2)} €</span>
          </div>
          <div class="order-item total-row">
            <span>Gesamt</span>
            <span>${order.total.toFixed(2)} €</span>
          </div>
        </div>
      </div>
      
      <div class="address-box">
        <strong>📍 Lieferadresse:</strong><br>
        ${order.street} ${order.house_number}<br>
        ${order.postal_code} ${order.city}
        ${order.instructions ? `<br><em style="color: #F43F5E;">📝 ${order.instructions}</em>` : ''}
      </div>
      
      <div style="text-align: center;">
        <a href="https://speeti.de/orders/${order.id}" class="cta-button">Bestellung verfolgen →</a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin-top: 30px;">
        Geschätzte Lieferzeit: <strong>15-20 Minuten</strong>
      </p>
    </div>
  `, `Deine Bestellung #${order.id} wurde bestätigt! 🎉`);
}

// Delivery status email
function deliveryStatusEmail(order, status) {
  const statusConfig = {
    preparing: {
      title: 'Wird vorbereitet! 👨‍🍳',
      message: 'Deine Bestellung wird gerade liebevoll zusammengestellt.',
      badge: 'status-preparing',
      badgeText: '🔄 Wird vorbereitet',
      gif: emailAssets.cookingGif
    },
    picking: {
      title: 'Wird vorbereitet! 👨‍🍳',
      message: 'Deine Bestellung wird gerade zusammengestellt.',
      badge: 'status-preparing',
      badgeText: '📦 Wird gepackt',
      gif: emailAssets.cookingGif
    },
    delivering: {
      title: 'Fahrer ist unterwegs! 🛵',
      message: 'Dein Fahrer hat deine Bestellung und ist auf dem Weg zu dir!',
      badge: 'status-delivering',
      badgeText: '🚀 Unterwegs',
      gif: emailAssets.deliveryGif
    },
    delivered: {
      title: 'Geliefert! 🎉',
      message: 'Deine Bestellung wurde erfolgreich zugestellt. Guten Appetit!',
      badge: 'status-delivered', 
      badgeText: '✅ Geliefert',
      gif: emailAssets.partyGif
    }
  };
  
  const config = statusConfig[status] || statusConfig.preparing;
  
  const isDone = (s) => {
    const order = ['confirmed', 'preparing', 'picking', 'delivering', 'delivered'];
    return order.indexOf(status) >= order.indexOf(s);
  };
  
  return emailTemplate(`
    <div class="content">
      <div class="gif-container">
        <img src="${config.gif}" alt="${config.title}" />
      </div>
      
      <h2 style="text-align: center; color: #1F2937;">${config.title}</h2>
      
      <div style="text-align: center; margin: 20px 0;">
        <span class="status-badge ${config.badge}">${config.badgeText}</span>
      </div>
      
      <p style="color: #4B5563; text-align: center;">${config.message}</p>
      
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div><strong>Bestätigt</strong><br><small style="color: #9CA3AF;">Bestellung eingegangen</small></div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot ${isDone('preparing') ? 'done' : 'pending'}"></div>
          <div><strong>Vorbereitung</strong><br><small style="color: #9CA3AF;">Wird zusammengestellt</small></div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot ${status === 'delivering' ? 'active' : isDone('delivering') ? 'done' : 'pending'}"></div>
          <div><strong>Unterwegs</strong><br><small style="color: #9CA3AF;">Fahrer auf dem Weg</small></div>
        </div>
        <div class="timeline-item">
          <div class="timeline-dot ${status === 'delivered' ? 'done' : 'pending'}"></div>
          <div><strong>Geliefert</strong><br><small style="color: #9CA3AF;">Bei dir angekommen</small></div>
        </div>
      </div>
      
      <div class="address-box">
        <strong>📍 Lieferadresse:</strong><br>
        ${order.street} ${order.house_number}, ${order.postal_code} ${order.city}
      </div>
      
      <div style="text-align: center;">
        <a href="https://speeti.de/orders/${order.id}" class="cta-button">Live verfolgen →</a>
      </div>
    </div>
  `, `Update zu deiner Bestellung #${order.id}: ${config.title}`);
}

// Waitlist welcome email
function waitlistEmail(email, city) {
  return emailTemplate(`
    <div class="content">
      <div class="gif-container">
        <img src="${emailAssets.rocketGif}" alt="Coming Soon!" />
      </div>
      
      <h2 style="text-align: center; color: #1F2937;">Du bist auf der Warteliste! 🚀</h2>
      
      <p style="color: #4B5563; text-align: center;">
        Wir sind noch nicht in <strong>${city}</strong>, aber wir arbeiten daran!<br>
        Du wirst als Erster informiert, sobald wir dort starten.
      </p>
      
      <div style="background: #FDF2F8; border-radius: 16px; padding: 25px; margin: 25px 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🏙️</div>
        <h3 style="color: #1F2937; margin: 0;">${city}</h3>
        <p style="color: #F43F5E; margin: 5px 0 0; font-weight: 600;">Coming Soon!</p>
      </div>
      
      <p style="color: #9CA3AF; font-size: 13px; text-align: center;">
        Tipp: Folge uns auf Instagram <a href="https://instagram.com/speeti.de" style="color: #F43F5E;">@speeti.de</a> für Updates!
      </p>
    </div>
  `, `Du bist auf unserer Warteliste für ${city}! 🎉`);
}

// Send email helper
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_PASS) {
    console.log('📧 Email would be sent to:', to, '- Subject:', subject);
    console.log('   (SMTP not configured, email skipped)');
    return { sent: false, reason: 'SMTP not configured' };
  }
  
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: '"Speeti 🚀" <speeti.delivery@gmail.com>',
      to,
      subject,
      html
    });
    console.log('✅ Email sent to:', to);
    return { sent: true };
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = {
  sendEmail,
  orderConfirmationEmail,
  deliveryStatusEmail,
  waitlistEmail,
  emailAssets
};
