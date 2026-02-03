const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional German invoice PDF
 * @param {Object} data - { order, address, customer, items, settings }
 * @returns {string} - Path to generated PDF
 */
async function generateInvoice(data) {
  const { order, address, customer, items, settings } = data;
  
  // Ensure invoices directory exists
  const invoiceDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
  }

  const invoiceNumber = `RE-${String(order.id).padStart(5, '0')}`;
  const pdfPath = path.join(invoiceDir, `${invoiceNumber}.pdf`);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Rechnung ${invoiceNumber}`,
          Author: settings.companyName || 'Speeti',
          Subject: 'Rechnung',
        }
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Colors
      const primaryColor = '#E11D48';
      const textColor = '#1F2937';
      const lightGray = '#9CA3AF';

      // Helpers
      const formatCurrency = (amount) => `${Number(amount).toFixed(2).replace('.', ',')} €`;
      const formatDate = (date) => new Date(date).toLocaleDateString('de-DE');

      // ========== HEADER ==========
      doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold')
         .text(settings.companyName || 'Speeti', 50, 50);
      
      doc.fontSize(10).fillColor(lightGray).font('Helvetica')
         .text(settings.slogan || 'Blitzschnell bei dir', 50, 78);

      // Company info (right side)
      doc.fontSize(9).fillColor(textColor)
         .text(settings.companyName || 'Speeti', 350, 50, { align: 'right' })
         .text(settings.companyStreet || '', 350, 63, { align: 'right' })
         .text(`${settings.companyPostalCode || ''} ${settings.companyCity || ''}`, 350, 76, { align: 'right' });
      
      if (settings.companyPhone) {
        doc.text(`Tel: ${settings.companyPhone}`, 350, 89, { align: 'right' });
      }
      if (settings.companyEmail) {
        doc.text(settings.companyEmail, 350, 102, { align: 'right' });
      }

      // ========== RECHNUNG TITLE ==========
      doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#E5E7EB').stroke();
      
      doc.fontSize(20).fillColor(textColor).font('Helvetica-Bold')
         .text('RECHNUNG', 50, 150);

      // Invoice details
      doc.fontSize(10).font('Helvetica')
         .text('Rechnungsnummer:', 50, 185)
         .font('Helvetica-Bold').text(invoiceNumber, 170, 185)
         .font('Helvetica')
         .text('Rechnungsdatum:', 50, 200)
         .text(formatDate(new Date()), 170, 200)
         .text('Bestellnummer:', 50, 215)
         .text(`#${order.id}`, 170, 215)
         .text('Lieferdatum:', 50, 230)
         .text(formatDate(order.delivered_at || order.created_at), 170, 230);

      // Payment status
      const paymentStatus = order.payment_status === 'paid' ? 'BEZAHLT' : 'OFFEN';
      const paymentColor = order.payment_status === 'paid' ? '#059669' : '#DC2626';
      doc.fontSize(11).font('Helvetica-Bold').fillColor(paymentColor)
         .text(paymentStatus, 450, 185);
      doc.fillColor(textColor);

      // ========== CUSTOMER ADDRESS ==========
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Rechnungsempfänger:', 350, 210);
      doc.font('Helvetica')
         .text(customer?.name || 'Kunde', 350, 225)
         .text(`${address?.street || ''} ${address?.house_number || ''}`, 350, 238)
         .text(`${address?.postal_code || ''} ${address?.city || 'Münster'}`, 350, 251);

      // ========== ITEMS TABLE ==========
      let y = 290;

      // Table header
      doc.fillColor('#F9FAFB').rect(50, y, 495, 25).fill();
      doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold')
         .text('Pos.', 55, y + 8)
         .text('Artikel', 85, y + 8)
         .text('Menge', 300, y + 8, { width: 50, align: 'right' })
         .text('Preis', 360, y + 8, { width: 60, align: 'right' })
         .text('MwSt', 425, y + 8)
         .text('Betrag', 470, y + 8, { width: 70, align: 'right' });

      y += 30;

      // Tax tracking
      let tax7Total = 0;
      let tax19Total = 0;
      let net7Total = 0;
      let net19Total = 0;

      const taxRateFood = Number(settings.taxRateFood) || 7;
      const taxRateOther = Number(settings.taxRateOther) || 19;

      // Items
      doc.font('Helvetica').fontSize(9);
      items.forEach((item, index) => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        
        // Food items = 7%, others = 19%
        const taxRate = item.tax_rate || taxRateFood;
        
        const netAmount = lineTotal / (1 + taxRate / 100);
        const taxAmount = lineTotal - netAmount;

        if (taxRate <= 10) {
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
           .text(String(item.name || '').substring(0, 35), 85, y)
           .text(`${item.quantity}x`, 300, y, { width: 50, align: 'right' })
           .text(formatCurrency(item.price), 360, y, { width: 60, align: 'right' })
           .text(`${taxRate}%`, 430, y)
           .text(formatCurrency(lineTotal), 470, y, { width: 70, align: 'right' });

        y += 20;

        if (y > 680) {
          doc.addPage();
          y = 50;
        }
      });

      // Delivery fee
      const deliveryFee = Number(order.delivery_fee) || 0;
      if (deliveryFee > 0) {
        const deliveryNet = deliveryFee / (1 + taxRateOther / 100);
        const deliveryTax = deliveryFee - deliveryNet;
        tax19Total += deliveryTax;
        net19Total += deliveryNet;

        y += 5;
        doc.text('', 55, y)
           .text('Liefergebühr', 85, y)
           .text('1x', 300, y, { width: 50, align: 'right' })
           .text(formatCurrency(deliveryFee), 360, y, { width: 60, align: 'right' })
           .text(`${taxRateOther}%`, 430, y)
           .text(formatCurrency(deliveryFee), 470, y, { width: 70, align: 'right' });
      }

      // ========== TOTALS ==========
      y += 35;
      doc.moveTo(300, y).lineTo(545, y).strokeColor('#E5E7EB').stroke();
      y += 15;

      doc.font('Helvetica').fontSize(9);
      
      // Subtotals by tax rate
      if (net7Total > 0) {
        doc.text(`Nettobetrag (${taxRateFood}% MwSt):`, 300, y)
           .text(formatCurrency(net7Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }
      if (net19Total > 0) {
        doc.text(`Nettobetrag (${taxRateOther}% MwSt):`, 300, y)
           .text(formatCurrency(net19Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }

      y += 5;
      if (tax7Total > 0) {
        doc.text(`MwSt ${taxRateFood}%:`, 300, y)
           .text(formatCurrency(tax7Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }
      if (tax19Total > 0) {
        doc.text(`MwSt ${taxRateOther}%:`, 300, y)
           .text(formatCurrency(tax19Total), 470, y, { width: 70, align: 'right' });
        y += 15;
      }

      // Total
      y += 10;
      doc.moveTo(300, y).lineTo(545, y).strokeColor(primaryColor).lineWidth(2).stroke();
      y += 12;
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Gesamtbetrag:', 300, y)
         .fillColor(primaryColor)
         .text(formatCurrency(order.total), 450, y, { width: 90, align: 'right' });

      // Payment method
      y += 30;
      doc.fontSize(9).fillColor(lightGray).font('Helvetica')
         .text(`Zahlungsart: ${getPaymentMethodName(order.payment_method)}`, 300, y);

      // ========== FOOTER ==========
      const footerY = 740;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#E5E7EB').lineWidth(1).stroke();

      doc.fontSize(8).fillColor(lightGray).font('Helvetica');
      
      // Company legal info
      const companyLine = [
        settings.companyName,
        settings.companyStreet,
        `${settings.companyPostalCode} ${settings.companyCity}`
      ].filter(Boolean).join(' | ');
      
      if (companyLine) {
        doc.text(companyLine, 50, footerY + 10, { align: 'center', width: 495 });
      }
      
      // Tax info
      const taxInfo = [];
      if (settings.taxNumber) taxInfo.push(`Steuernr: ${settings.taxNumber}`);
      if (settings.vatId) taxInfo.push(`USt-IdNr: ${settings.vatId}`);
      
      if (taxInfo.length > 0) {
        doc.text(taxInfo.join(' | '), 50, footerY + 22, { align: 'center', width: 495 });
      }

      // Bank info
      if (settings.bankName || settings.iban) {
        const bankLine = [
          settings.bankName,
          settings.iban ? `IBAN: ${settings.iban}` : null,
          settings.bic ? `BIC: ${settings.bic}` : null
        ].filter(Boolean).join(' | ');
        doc.text(bankLine, 50, footerY + 34, { align: 'center', width: 495 });
      }

      // Thank you message
      doc.fontSize(9).fillColor(textColor)
         .text('Vielen Dank für Ihre Bestellung!', 50, footerY - 25, { align: 'center', width: 495 });

      doc.end();

      writeStream.on('finish', () => resolve(pdfPath));
      writeStream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
}

function getPaymentMethodName(method) {
  const names = {
    'cash': 'Barzahlung bei Lieferung',
    'card': 'Kartenzahlung bei Lieferung',
    'stripe': 'Online-Zahlung (Stripe)',
    'paypal': 'PayPal',
    'klarna': 'Klarna',
    'sofort': 'Sofortüberweisung',
    'googlepay': 'Google Pay',
    'applepay': 'Apple Pay'
  };
  return names[method] || method || 'Unbekannt';
}

/**
 * Generate invoice number
 * Format: RE-NNNNN (e.g., RE-00001)
 */
function generateInvoiceNumber(orderId) {
  return `RE-${String(orderId).padStart(5, '0')}`;
}

module.exports = { generateInvoice, generateInvoiceNumber };
