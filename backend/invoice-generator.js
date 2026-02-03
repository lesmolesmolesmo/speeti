const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional invoice PDF
 * @param {Object} order - Order data with items, customer, address
 * @param {Object} business - Business settings (name, address, tax info)
 * @returns {Buffer} - PDF buffer
 */
function generateInvoice(order, business) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Rechnung ${order.invoice_number}`,
          Author: business.company_name || 'Speeti',
          Subject: 'Rechnung',
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const primaryColor = '#E11D48'; // Rose-600
      const textColor = '#1F2937';
      const lightGray = '#9CA3AF';

      // Helper for formatting currency
      const formatCurrency = (amount) => `${amount.toFixed(2).replace('.', ',')} €`;
      const formatDate = (date) => new Date(date).toLocaleDateString('de-DE');

      // ========== HEADER ==========
      doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold')
         .text(business.company_name || 'Speeti', 50, 50);
      
      doc.fontSize(10).fillColor(lightGray).font('Helvetica')
         .text('Blitzschnelle Lieferung', 50, 78);

      // Company info (right side)
      doc.fontSize(9).fillColor(textColor)
         .text(business.company_name || 'Speeti GmbH', 350, 50, { align: 'right' })
         .text(business.street || 'Musterstraße 1', 350, 63, { align: 'right' })
         .text(`${business.postal_code || '48149'} ${business.city || 'Münster'}`, 350, 76, { align: 'right' })
         .text(`Tel: ${business.phone || '+49 251 12345678'}`, 350, 89, { align: 'right' })
         .text(business.email || 'info@speeti.de', 350, 102, { align: 'right' });

      // ========== RECHNUNG TITLE ==========
      doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#E5E7EB').stroke();
      
      doc.fontSize(20).fillColor(textColor).font('Helvetica-Bold')
         .text('RECHNUNG', 50, 150);

      // Invoice details
      doc.fontSize(10).font('Helvetica')
         .text(`Rechnungsnummer:`, 50, 180)
         .font('Helvetica-Bold').text(order.invoice_number, 170, 180)
         .font('Helvetica')
         .text(`Rechnungsdatum:`, 50, 195)
         .text(formatDate(order.invoice_date || order.created_at), 170, 195)
         .text(`Bestellnummer:`, 50, 210)
         .text(`#${order.id}`, 170, 210)
         .text(`Lieferdatum:`, 50, 225)
         .text(formatDate(order.delivered_at || order.created_at), 170, 225);

      // Payment status
      const paymentStatus = order.payment_status === 'paid' ? 'Bezahlt' : 'Offen';
      const paymentColor = order.payment_status === 'paid' ? '#059669' : '#DC2626';
      doc.font('Helvetica-Bold').fillColor(paymentColor)
         .text(paymentStatus, 450, 180);
      doc.fillColor(textColor);

      // ========== CUSTOMER ADDRESS ==========
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Rechnungsadresse:', 350, 195);
      doc.font('Helvetica')
         .text(order.customer_name, 350, 210)
         .text(`${order.street} ${order.house_number}`, 350, 223)
         .text(`${order.postal_code} ${order.city}`, 350, 236);

      // ========== ITEMS TABLE ==========
      let y = 280;

      // Table header
      doc.fillColor('#F3F4F6').rect(50, y, 495, 25).fill();
      doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold')
         .text('Pos.', 55, y + 8)
         .text('Artikel', 85, y + 8)
         .text('Menge', 320, y + 8, { width: 50, align: 'right' })
         .text('Einheit', 375, y + 8)
         .text('MwSt', 425, y + 8)
         .text('Betrag', 470, y + 8, { width: 70, align: 'right' });

      y += 30;

      // Tax tracking
      let tax7Total = 0;
      let tax19Total = 0;
      let net7Total = 0;
      let net19Total = 0;

      // Items
      doc.font('Helvetica').fontSize(9);
      order.items.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        
        // Determine tax rate (food items = 7%, others = 19%)
        const taxRate = item.tax_rate || (item.category_name && 
          ['Getränke', 'Snacks', 'Obst & Gemüse', 'Milchprodukte', 'Brot & Backwaren', 'Fleisch & Wurst', 'Tiefkühl'].some(c => 
            item.category_name.toLowerCase().includes(c.toLowerCase())
          ) ? 7 : 19);
        
        const netAmount = lineTotal / (1 + taxRate / 100);
        const taxAmount = lineTotal - netAmount;

        if (taxRate === 7) {
          tax7Total += taxAmount;
          net7Total += netAmount;
        } else {
          tax19Total += taxAmount;
          net19Total += netAmount;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.fillColor('#FAFAFA').rect(50, y - 3, 495, 20).fill();
        }
        doc.fillColor(textColor);

        doc.text(`${index + 1}`, 55, y)
           .text(item.name.substring(0, 40), 85, y)
           .text(`${item.quantity}`, 320, y, { width: 50, align: 'right' })
           .text(item.unit || 'Stück', 375, y)
           .text(`${taxRate}%`, 425, y)
           .text(formatCurrency(lineTotal), 470, y, { width: 70, align: 'right' });

        y += 20;

        // Page break if needed
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });

      // Delivery fee row
      const deliveryNet = order.delivery_fee / 1.19;
      const deliveryTax = order.delivery_fee - deliveryNet;
      tax19Total += deliveryTax;
      net19Total += deliveryNet;

      y += 5;
      doc.text('', 55, y)
         .text('Liefergebühr', 85, y)
         .text('1', 320, y, { width: 50, align: 'right' })
         .text('', 375, y)
         .text('19%', 425, y)
         .text(formatCurrency(order.delivery_fee), 470, y, { width: 70, align: 'right' });

      // ========== TOTALS ==========
      y += 35;
      doc.moveTo(300, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();
      y += 15;

      // Net amounts
      doc.font('Helvetica').fontSize(9);
      if (net7Total > 0) {
        doc.text('Nettobetrag (7% MwSt):', 300, y)
           .text(formatCurrency(net7Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }
      if (net19Total > 0) {
        doc.text('Nettobetrag (19% MwSt):', 300, y)
           .text(formatCurrency(net19Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }

      // Tax amounts
      y += 5;
      if (tax7Total > 0) {
        doc.text('MwSt 7%:', 300, y)
           .text(formatCurrency(tax7Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }
      if (tax19Total > 0) {
        doc.text('MwSt 19%:', 300, y)
           .text(formatCurrency(tax19Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }

      // Total
      y += 10;
      doc.moveTo(300, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();
      y += 10;
      
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Gesamtbetrag:', 300, y)
         .fillColor(primaryColor)
         .text(formatCurrency(order.total), 470, y, { width: 70, align: 'right' });

      // Payment method
      y += 25;
      doc.fontSize(9).fillColor(lightGray).font('Helvetica')
         .text(`Zahlungsart: ${getPaymentMethodName(order.payment_method)}`, 300, y);

      // ========== FOOTER ==========
      const footerY = 750;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#E5E7EB').stroke();

      doc.fontSize(8).fillColor(lightGray).font('Helvetica');
      
      // Company legal info
      doc.text(`${business.company_name || 'Speeti GmbH'} | ${business.street || 'Musterstraße 1'} | ${business.postal_code || '48149'} ${business.city || 'Münster'}`, 50, footerY + 10, { align: 'center', width: 495 });
      
      // Tax info
      const taxInfo = [];
      if (business.tax_number) taxInfo.push(`Steuernummer: ${business.tax_number}`);
      if (business.vat_id) taxInfo.push(`USt-IdNr: ${business.vat_id}`);
      if (business.registry) taxInfo.push(`${business.registry}`);
      
      if (taxInfo.length > 0) {
        doc.text(taxInfo.join(' | '), 50, footerY + 22, { align: 'center', width: 495 });
      }

      // Bank info
      if (business.bank_name) {
        doc.text(`${business.bank_name} | IBAN: ${business.iban || 'DE...'} | BIC: ${business.bic || '...'}`, 50, footerY + 34, { align: 'center', width: 495 });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getPaymentMethodName(method) {
  const names = {
    'cash': 'Barzahlung',
    'card': 'Kreditkarte',
    'stripe': 'Online-Zahlung',
    'paypal': 'PayPal',
    'klarna': 'Klarna',
    'sofort': 'Sofortüberweisung',
    'googlepay': 'Google Pay',
    'applepay': 'Apple Pay'
  };
  return names[method] || method;
}

/**
 * Generate invoice number
 * Format: RE-YYYY-NNNNN (e.g., RE-2026-00001)
 */
function generateInvoiceNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `RE-${year}-`;
  
  // Get last invoice number for this year
  const lastInvoice = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.invoice_number.split('-')[2], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}

module.exports = { generateInvoice, generateInvoiceNumber };
