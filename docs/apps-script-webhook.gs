/**
 * Muscle OS Funnel Log — Google Apps Script Webhook
 *
 * Setup:
 *   1. Create a new Google Sheet named "Muscle OS Funnel Log"
 *   2. Add a header row:  timestamp | page | event_type | tag | referrer | session_id
 *   3. Extensions → Apps Script → paste this file → save
 *   4. Deploy → New deployment → Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   5. Copy the /exec URL
 *   6. Paste it into website/assets/tracking.js as FUNNEL_WEBHOOK_URL
 *
 * Test the deployed URL from a browser console:
 *   fetch('YOUR_URL_HERE', {
 *     method: 'POST',
 *     mode: 'no-cors',
 *     body: JSON.stringify({ page:'/test', event_type:'pageview', tag:'', referrer:'', session_id:'test-123' })
 *   });
 *
 * The sheet should show a new row. If empty rows appear, check that the
 * header row exactly matches the column order used in appendRow() below.
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
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
