/**
 * Muscle OS Funnel Log — Google Apps Script Webhook
 *
 * Setup:
 *   1. Create a new Google Sheet named "Muscle OS Funnel Log"
 *   2. Add header row: timestamp | page | event_type | tag | referrer | session_id
 *   3. Extensions → Apps Script → paste this file → save
 *   4. Deploy → New deployment → Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   5. Copy the /exec URL
 *   6. Paste it into website/assets/tracking.js as FUNNEL_WEBHOOK_URL
 *
 * For Pending Orders notifications:
 *   7. Add a second sheet tab named "Pending Orders"
 *   8. Add header row: timestamp | order_id | customer_name | product | payment_method | payment_ref | whatsapp | email | status
 *   (See DOCUMENTATION.md for manual Google Sheets notification setup)
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  // If this is an order event, log to the "Pending Orders" sheet tab
  if (data.event_type === 'order_submitted' || data.event_type === 'order_created') {
    var ordersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending Orders');
    if (ordersSheet) {
      ordersSheet.appendRow([
        new Date(),
        data.order_id || '',
        data.customer_name || '',
        data.product || '',
        data.payment_method || '',
        data.payment_ref || '',
        data.whatsapp || '',
        data.email || '',
        'pending'
      ]);
    }
  }

  // Log main funnel event
  sheet.appendRow([
    new Date(),
    data.page || '',
    data.event_type || '',
    data.tag || '',
    data.referrer || '',
    data.session_id || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({status: 'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}
