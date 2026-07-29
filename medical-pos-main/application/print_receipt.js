const printJS = require('print-js');

function printReceipt(htmlContent) {
  printJS({ printable: htmlContent, type: 'raw-html' });
}

// Example usage:
const receiptHtml = `<div style="font-size: 12px; text-align: center;">
  <h2>Receipt</h2>
  <p>Order No: 12345</p>
  <p>Date: 2025-09-14</p>
  <hr>
  <table style="width: 100%; font-size: 11px;">
    <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
    <tr><td>Test A</td><td>2</td><td>Rs 500</td></tr>
    <tr><td>Test B</td><td>1</td><td>Rs 1000</td></tr>
  </table>
  <hr>
  <p><b>Total: Rs 2000</b></p>
</div>`;

// To print, call:
// printReceipt(receiptHtml);

module.exports = { printReceipt };
