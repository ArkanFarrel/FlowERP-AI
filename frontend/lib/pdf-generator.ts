export interface InvoicePDFData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  status: string;
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  currency?: string;
  notes?: string;
}

/**
 * PDF Generator Terstruktur untuk pencetakan Invois / Sales Order / Purchase Order yang presisi & profesional.
 */
export function generateStructuredInvoicePDF(data: InvoicePDFData) {
  const currencySymbol = data.currency || '$';
  const formatMoney = (val: number) => `${currencySymbol}${val.toLocaleString()}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${data.invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        body { padding: 40px; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.5; }
        .invoice-box { max-w: 800px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-b: 2px solid #0284c7; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-logo { width: 36px; height: 36px; background: #0284c7; color: #fff; font-weight: 900; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .company-title { font-size: 20px; font-weight: 800; color: #0f172a; }
        .company-sub { font-size: 11px; color: #64748b; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { font-size: 24px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
        .status-badge { display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; background: #dcfce7; color: #15803d; margin-top: 4px; }
        .details-grid { display: flex; justify-content: space-between; margin: 30px 0; gap: 20px; }
        .address-col { flex: 1; }
        .address-col h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 6px; }
        .address-col p { font-size: 13px; font-weight: 600; color: #334155; }
        .address-col span { font-size: 12px; color: #64748b; display: block; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 10px 14px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .text-right { text-align: right; }
        .summary-table { width: 280px; margin-left: auto; margin-top: 20px; }
        .summary-table td { padding: 6px 12px; border: none; }
        .summary-table .total-row { font-size: 15px; font-weight: 800; color: #0284c7; border-top: 2px solid #0284c7; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div class="brand">
            <div class="brand-logo">F</div>
            <div>
              <div class="company-title">${data.companyName}</div>
              <div class="company-sub">${data.companyAddress || 'Enterprise Intelligence Suite'}</div>
            </div>
          </div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <div>#${data.invoiceNumber}</div>
            <div class="status-badge">${data.status}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="address-col">
            <h4>Billed To</h4>
            <p>${data.customerName}</p>
            <span>${data.customerEmail || ''}</span>
            <span>${data.customerPhone || ''}</span>
            <span>${data.customerAddress || ''}</span>
          </div>
          <div class="address-col text-right">
            <h4>Invoice Details</h4>
            <span><strong>Date Issued:</strong> ${data.date}</span>
            <span><strong>Due Date:</strong> ${data.dueDate || data.date}</span>
            <span><strong>Currency:</strong> ${data.currency || 'USD'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td style="font-weight: 600;">${item.name}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatMoney(item.unitPrice)}</td>
                <td class="text-right" style="font-weight: 700;">${formatMoney(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="summary-table">
          <tr>
            <td style="color: #64748b;">Subtotal</td>
            <td class="text-right" style="font-weight: 600;">${formatMoney(data.subtotal)}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Tax (${data.tax}%)</td>
            <td class="text-right" style="font-weight: 600;">${formatMoney(data.subtotal * (data.tax / 100))}</td>
          </tr>
          <tr class="total-row">
            <td>Total Due</td>
            <td class="text-right">${formatMoney(data.total)}</td>
          </tr>
        </table>

        <div class="footer">
          <p>${data.notes || 'Thank you for your business! - FlowERP AI Suite'}</p>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
