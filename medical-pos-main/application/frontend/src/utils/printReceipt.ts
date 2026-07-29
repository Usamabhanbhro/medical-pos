import printJS from 'print-js';

export interface ReceiptTest {
  name: string;
  sell_price: number;
}

export interface ReceiptData {
  patientName: string;
  patientGender?: string;
  patientAge?: number;
  patientPhone?: string;
  referredBy?: string;
  doctorName?: string;
  date?: string | Date;
  tests: ReceiptTest[];
  subtotal: number;
  discountAmount?: number;
  discountLabel?: string;
  total: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  saleId?: string;
  isPartial?: boolean;
  paidAmount?: number;
  remainingAmount?: number;
  previousPaidAmount?: number;
  latestPaymentAmount?: number;
  totalPaidAmount?: number;
  printerNotes?: string;
}

export function printReceipt(data: ReceiptData) {
  const issuedAt = data.date ? new Date(data.date) : new Date();
  const dateStr = issuedAt.toLocaleDateString('en-GB');
  const timeStr = issuedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const paymentStatus = data.isPartial ? 'Partial Payment' : 'Full Payment';
  const safeNumber = (value: unknown, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const subtotal = safeNumber(data.subtotal, 0);
  const netPayable = safeNumber(data.total, 0);
  const discountAmount = data.discountAmount !== undefined
    ? Math.max(safeNumber(data.discountAmount, 0), 0)
    : Math.max(subtotal - netPayable, 0);

  const hasSplitPaid =
    data.latestPaymentAmount !== undefined ||
    data.previousPaidAmount !== undefined ||
    data.totalPaidAmount !== undefined;

  const latestPaid = hasSplitPaid
    ? Math.max(safeNumber(data.latestPaymentAmount ?? data.paidAmount, 0), 0)
    : Math.max(safeNumber(data.paidAmount ?? (data.isPartial ? 0 : netPayable), 0), 0);

  const inferredTotalPaid = safeNumber(data.totalPaidAmount, safeNumber(data.paidAmount, latestPaid));
  const previousPaid = hasSplitPaid
    ? Math.max(safeNumber(data.previousPaidAmount, inferredTotalPaid - latestPaid), 0)
    : 0;

  const totalPaid = hasSplitPaid
    ? Math.max(safeNumber(data.totalPaidAmount, previousPaid + latestPaid), 0)
    : Math.max(safeNumber(data.paidAmount ?? (data.isPartial ? 0 : netPayable), 0), 0);

  const remaining = Math.max(
    data.remainingAmount !== undefined
      ? safeNumber(data.remainingAmount, 0)
      : (data.isPartial ? netPayable - totalPaid : 0),
    0,
  );

  const formatCurrency = (value: number) => `Rs ${value.toFixed(2)}`;

  const discountRow = discountAmount > 0 ? `<div class="row"><span>Discount${data.discountLabel ? ` (${data.discountLabel})` : ''}</span><span>- Rs ${discountAmount.toFixed(2)}</span></div>` : '';
  const previousPaidRow = hasSplitPaid
    ? `<div class="row"><span>Previous Paid Amount</span><span>${formatCurrency(previousPaid)}</span></div>`
    : '';
  const totalPaidRow = hasSplitPaid
    ? `<div class="row"><span>Total</span><span>${formatCurrency(totalPaid)}</span></div>`
    : '';
  const paidRowValue = hasSplitPaid ? latestPaid : totalPaid;

  const storeAddressLine = data.storeAddress ? `<div class="store-meta">${data.storeAddress}</div>` : '';
  const storePhoneLine = data.storePhone ? `<div class="store-meta">Phone: ${data.storePhone}</div>` : '';

  const receiptHtml = `<div class="receipt-root">
      <div class="header">
        <div class="store-name">${data.storeName || 'Receipt'}</div>
        ${storeAddressLine}
        ${storePhoneLine}
      </div>
      <div class="divider"></div>
      <div class="meta">
        <div><span>Slip No:</span><strong>${data.saleId || '-'}</strong></div>
        <div><span>Date:</span><strong>${dateStr}</strong></div>
        <div><span>Time:</span><strong>${timeStr}</strong></div>
        <div><span>Status:</span><strong>${paymentStatus}</strong></div>
      </div>
      <div class="section">
        <div class="row"><span>Patient Name</span><strong>${data.patientName}</strong></div>
        ${data.patientGender ? `<div class="row"><span>Gender</span><strong>${data.patientGender}</strong></div>` : ''}
        ${data.patientAge ? `<div class="row"><span>Patient Age</span><strong>${data.patientAge} years</strong></div>` : ''}
        ${data.patientPhone ? `<div class="row"><span>Contact</span><strong>${data.patientPhone}</strong></div>` : ''}
        ${data.referredBy ? `<div class="row"><span>Referred By</span><strong>${data.referredBy}</strong></div>` : ''}
        <div class="row"><span>Doctor Name</span><strong>${data.doctorName || 'N/A'}</strong></div>
      </div>
      <table class="tests">
        <thead>
          <tr><th>#</th><th>Test Name</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${data.tests.map((test, index) => {
            // Break long test names into multiple lines for receipt
            const testName = test.name;
            const maxLineLength = 25; // Adjust based on receipt width
            const words = testName.split(' ');
            const lines: string[] = [];
            let currentLine = '';

            words.forEach(word => {
              const tentative = currentLine ? `${currentLine} ${word}` : word;
              if (tentative.length <= maxLineLength) {
                currentLine = tentative;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) lines.push(currentLine);

            const formattedName = lines.join('<br>');
            return `<tr><td>${index + 1}</td><td class="test-name-cell">${formattedName}</td><td>Rs ${Number(test.sell_price).toFixed(2)}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${discountRow}
        <div class="row grand"><span>Net Payable</span><span>${formatCurrency(netPayable)}</span></div>
        ${previousPaidRow}
        <div class="row"><span>Paid</span><span>${formatCurrency(paidRowValue)}</span></div>
        ${totalPaidRow}
        <div class="row"><span>Balance</span><span>${formatCurrency(remaining)}</span></div>
      </div>
      <div class="customer-copy-section">
        <div class="customer-copy-header">(Customer Copy)</div>
        <div class="print-date-box">
          <span class="print-date-label">Print Date</span>
          <span class="print-date-value">${dateStr}</span>
          <span class="print-time-value">${timeStr}</span>
        </div>
      </div>
      <div class="instructions-section">
        <div class="instructions-header">INSTRUCTION FOR CLIENT</div>
        <ol class="instructions-list">
          <li>Please check amount on receipt issued by reception counter.</li>
          <li>Report collection timing 6:00pm To 10:00pm Daily.(except sunday)</li>
          <li>Collect your report within one month,otherwise company will not be responsible.</li>
          <li>In case of any strike, holidays or law & order situation the report may be delayed in this regard, and your co-operation will highly be appreciated.</li>
          <li>In case of prior appointment kindly approach at center to perform your test within one month otherwise you can not claim your payment and organization will not be responsible.</li>
          <li>You must submit your MRI/CT scan film if you need reports.</li>
        </ol>
      </div>
      <div class="footer">
        <p>Thank you for choosing us. Please bring this receipt on your next visit.</p>
        ${data.printerNotes ? `<p class="notes">${data.printerNotes}</p>` : ''}
      </div>
      <div class="powered-by">
        <p>Powered by <strong>Humdan Khattak</strong></p>
        <p>Contact: 03463757051</p>
      </div>
    </div>`;

  printJS({
    printable: receiptHtml.trim(),
    type: 'raw-html',
    style: `
      @page { size: auto; margin: 2mm 4mm 6mm 4mm; }
      body {
        margin: 0;
        font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif;
        font-size: 12px;
        color: #0b0b0b;
        -webkit-print-color-adjust: exact;
      }
      .receipt-root { font-size: 12px; width: 60mm; margin: 0 auto; color: #0b0b0b; }
      .header { text-align: center; margin-bottom: 6px; }
      .store-name { font-size: 17px; font-weight: 700; letter-spacing: 0.6px; color: #000000; }
      .store-meta { font-size: 11px; white-space: pre-line; color: #111111; margin-top: 3px; }
      .divider { border-top: 1px dashed #000000; margin: 5px 0; }
      .meta { font-size: 11px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 6px; margin-bottom: 8px; color: #000000; }
      .meta span { color: #000000; font-weight: 600; }
      .meta strong { color: #000000; }
      .section { font-size: 11px; border: 1px solid #111111; border-radius: 4px; padding: 5px 6px; margin-bottom: 8px; color: #000000; }
      .row { display: flex; justify-content: space-between; gap: 6px; }
      .row span { color: #000000; font-weight: 600; }
      .row strong { color: #000000; font-weight: 600; }
      .tests { width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 8px; color: #000000; }
      .tests th, .tests td { padding: 4px 2px; border-bottom: 1px solid #111111; text-align: left; vertical-align: top; }
      .tests th { font-size: 11px; font-weight: 700; color: #000000; }
      .tests td { color: #000000; }
      .tests th:last-child, .tests td:last-child { text-align: right; }
      .tests th:first-child, .tests td:first-child { width: 8%; }
      .test-name-cell { line-height: 1.3; word-wrap: break-word; max-width: 35mm; }
      .totals { font-size: 11px; border: 1px dashed #000000; border-radius: 4px; padding: 5px 6px; margin-bottom: 8px; color: #000000; }
      .totals .grand { font-weight: 700; border-top: 1px solid #000000; margin-top: 4px; padding-top: 4px; }
      .customer-copy-section { margin: 8px 0; text-align: center; }
      .customer-copy-header { font-size: 12px; font-weight: 700; color: #000000; margin-bottom: 5px; }
      .print-date-box { border: 1px solid #000000; padding: 4px 6px; display: inline-block; font-size: 10px; color: #000000; }
      .print-date-label { font-weight: 600; margin-right: 4px; }
      .print-date-value { margin-right: 8px; }
      .print-time-value { margin-left: 4px; }
      .instructions-section { margin: 10px 0; padding: 6px; border: 1px solid #000000; }
      .instructions-header { font-size: 11px; font-weight: 700; text-align: center; text-decoration: underline; margin-bottom: 6px; color: #000000; letter-spacing: 0.5px; }
      .instructions-list { font-size: 9px; padding-left: 16px; margin: 0; color: #000000; line-height: 1.5; }
      .instructions-list li { margin-bottom: 3px; text-align: left; }
      .footer { font-size: 10px; text-align: center; color: #000000; line-height: 1.5; font-weight: 500; }
      .footer .notes { margin-top: 5px; color: #000000; font-weight: 600; }
      .powered-by { font-size: 9px; text-align: center; color: #000000; margin-top: 8px; padding-top: 6px; border-top: 1px solid #000000; }
      .powered-by p { margin: 2px 0; }
      .powered-by strong { font-weight: 700; }
    `,
  });
}
