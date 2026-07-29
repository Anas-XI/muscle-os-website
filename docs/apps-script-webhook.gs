/**
 * Muscle OS Funnel Log — Google Apps Script Webhook
 *
 * Setup:
 *   1. Create a Google Sheet named "Muscle OS Funnel Log"
 *   2. Add header row to Sheet1: timestamp | page | event_type | tag | referrer | session_id
 *   3. (Optional) Add second sheet tab "Pending Orders" with header row:
 *      timestamp | order_id | customer_name | product | payment_method | payment_ref | whatsapp | email | status
 *   4. Extensions → Apps Script → paste this file → save
 *   5. Deploy → New deployment → Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   6. Copy the /exec URL
 *   7. Paste it into website/assets/tracking.js as FUNNEL_WEBHOOK_URL
 *   8. Set ANALYTICS_KEY below to a secret string, then use the same string
 *      when opening admin/analytics.html
 *   9. (Optional) Triggers → Add Trigger → sendWeeklySummaryEmail → time-driven → weekly
 */

// ─── Anas: Pick any string, keep it secret, use same in admin/analytics.html ───
var ANALYTICS_KEY = 'YOUR_SECRET_HERE';

// ─── Funnel stage tag groupings (mirrors DOCUMENTATION.md §11) ───
var FUNNEL_TAGS = {
  top:    ['nav_whatsapp','hero_cta_main','footer_wa','guide_cta','listing_cta'],
  middle: ['split_quiz_result_cta','rpe_result_cta','train_generated_cta',
           'train_footer_cta_bottom','train_subscribe_bottom'],
  bottom: ['pkg_standard','pkg_premium','contact_wa','cross_sell_offer',
           'tools_gate','book_buy_cta']
};

// ═══════════════════════════════════════════════════════════════════
//  WEBHOOK (used by tracking.js)
// ═══════════════════════════════════════════════════════════════════

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

  // Also log order_approved / order_rejected to Pending Orders tab if order_id present
  if ((data.event_type === 'order_approved' || data.event_type === 'order_rejected') && data.order_id) {
    var ordersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending Orders');
    if (ordersSheet) {
      ordersSheet.appendRow([
        new Date(),
        data.order_id || '',
        '',
        data.product || '',
        '',
        '',
        '',
        '',
        data.event_type === 'order_approved' ? 'approved' : 'rejected'
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

// ═══════════════════════════════════════════════════════════════════
//  ANALYTICS ENDPOINT (read by admin/analytics.html)
// ═══════════════════════════════════════════════════════════════════

function doGet(e) {
  // Authenticate
  var key = e && e.parameter && e.parameter.key;
  if (!key || key !== ANALYTICS_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({error: 'unauthorized'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var result = computeSummary();
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════
//  SHARED SUMMARY COMPUTATION
// ═══════════════════════════════════════════════════════════════════

function computeSummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var eventsSheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];

  var now = new Date();
  var today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  var sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  var fourteenDaysAgo = new Date(today.getTime() - 14 * 86400000);

  // ── Read events data ──
  var eventsVals = eventsSheet.getDataRange().getValues();
  var headers = eventsVals.shift() || [];

  // Categorize by date range
  var thisWeek = [];    // last 7 days
  var prevWeek = [];    // 7-14 days ago

  eventsVals.forEach(function(row) {
    var ts = new Date(row[0]);
    if (ts >= sevenDaysAgo) {
      thisWeek.push(row);
    } else if (ts >= fourteenDaysAgo && ts < sevenDaysAgo) {
      prevWeek.push(row);
    }
  });

  // ── Compute helper ──
  function stageForTag(tag) {
    if (FUNNEL_TAGS.top.indexOf(tag) !== -1) return 'top';
    if (FUNNEL_TAGS.middle.indexOf(tag) !== -1) return 'middle';
    if (FUNNEL_TAGS.bottom.indexOf(tag) !== -1) return 'bottom';
    return null;
  }

  function countByField(rows, eventType, field) {
    var map = {};
    rows.forEach(function(r) {
      if (r[2] === eventType) {
        var val = r[field] || 'unknown';
        map[val] = (map[val] || 0) + 1;
      }
    });
    return map;
  }

  function asSortedArray(map) {
    var arr = [];
    for (var k in map) {
      if (map.hasOwnProperty(k)) arr.push({key: k, count: map[k]});
    }
    arr.sort(function(a,b){ return b.count - a.count; });
    return arr;
  }

  function topN(map, n) {
    return asSortedArray(map).slice(0, n);
  }

  function pctChange(current, previous) {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return Math.round((current - previous) / previous * 1000) / 10;
  }

  // ── 1. Funnel stage breakdown ──
  var twWaClicks = thisWeek.filter(function(r){ return r[2] === 'whatsapp_click'; });
  var stageCounts = {top: 0, middle: 0, bottom: 0};
  twWaClicks.forEach(function(r) {
    var stage = stageForTag(r[3]);
    if (stage) stageCounts[stage]++;
  });
  var totalWa = twWaClicks.length;

  // ── 2. Top pages (last 7 days pageviews) ──
  var pageCounts = countByField(thisWeek, 'pageview', 1);
  var topPages = topN(pageCounts, 5);

  // ── 3. Top WhatsApp tags (last 7 days) ──
  var tagCounts = countByField(thisWeek, 'whatsapp_click', 3);
  var topTags = topN(tagCounts, 5);

  // ── 4. Order funnel ──
  var orderSubmitted = thisWeek.filter(function(r){ return r[2] === 'order_submitted'; }).length;
  var orderApproved = thisWeek.filter(function(r){ return r[2] === 'order_approved'; }).length;
  var orderRejected = thisWeek.filter(function(r){ return r[2] === 'order_rejected'; }).length;
  var approvalRate = orderSubmitted > 0
    ? Math.round(orderApproved / (orderApproved + orderRejected) * 100) : 0;

  // Rejection reasons breakdown
  var rejections = {};
  thisWeek.forEach(function(r) {
    if (r[2] === 'order_rejected' && r[3]) {
      rejections[r[3]] = (rejections[r[3]] || 0) + 1;
    }
  });

  // ── 5. Week-over-week deltas ──
  function countEvent(rows, type) { return rows.filter(function(r){ return r[2] === type; }).length; }

  var twPageviews = countEvent(thisWeek, 'pageview');
  var pwPageviews = countEvent(prevWeek, 'pageview');
  var twWaClicksCount = countEvent(thisWeek, 'whatsapp_click');
  var pwWaClicksCount = countEvent(prevWeek, 'whatsapp_click');
  var twOrders = orderSubmitted;
  var pwOrders = countEvent(prevWeek, 'order_submitted');

  function trendObj(current, previous) {
    return {
      current: current,
      previous: previous,
      percentChange: pctChange(current, previous)
    };
  }

  // ── Build result ──
  var hasPrevData = prevWeek.length > 0;

  return {
    funnel: {
      top:    { count: stageCounts.top,    stagePct: totalWa > 0 ? Math.round(stageCounts.top / totalWa * 100) : 0 },
      middle: { count: stageCounts.middle, stagePct: totalWa > 0 ? Math.round(stageCounts.middle / totalWa * 100) : 0 },
      bottom: { count: stageCounts.bottom, stagePct: totalWa > 0 ? Math.round(stageCounts.bottom / totalWa * 100) : 0 }
    },
    topPages: topPages.map(function(o){ return {page: o.key, views: o.count}; }),
    topTags: topTags.map(function(o){ return {tag: o.key, clicks: o.count}; }),
    orders: {
      submitted: orderSubmitted,
      approved: orderApproved,
      rejected: orderRejected,
      approvalRate: approvalRate,
      rejectionReasons: rejections
    },
    trends: {
      pageviews: hasPrevData ? trendObj(twPageviews, pwPageviews) : { current: twPageviews, previous: pwPageviews, percentChange: null },
      whatsappClicks: hasPrevData ? trendObj(twWaClicksCount, pwWaClicksCount) : { current: twWaClicksCount, previous: pwWaClicksCount, percentChange: null },
      ordersSubmitted: hasPrevData ? trendObj(twOrders, pwOrders) : { current: twOrders, previous: pwOrders, percentChange: null }
    },
    lastComputed: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════════
//  WEEKLY EMAIL DIGEST
// ═══════════════════════════════════════════════════════════════════

function sendWeeklySummaryEmail() {
  var summary = computeSummary();
  var now = new Date();
  var weekAgo = new Date(now.getTime() - 7 * 86400000);

  var dateStr = formatDateShort(weekAgo) + ' — ' + formatDateShort(now);

  function stageEmoji(name) {
    return {top: '🔝', middle: '💡', bottom: '🎯'}[name] || '';
  }

  function pctDisplay(t) {
    if (t === null || t === undefined) return 'N/A (not enough data yet)';
    var arrow = t > 0 ? '▲' : (t < 0 ? '▼' : '—');
    return arrow + ' ' + Math.abs(t) + '%';
  }

  // Build email body
  var body = 'Muscle OS — Weekly Summary (' + dateStr + ')\n';
  body += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Glance
  body += '📊 THIS WEEK AT A GLANCE\n';
  body += '  Pageviews:       ' + summary.trends.pageviews.current + '  (' + pctDisplay(summary.trends.pageviews.percentChange) + ' vs last week)\n';
  body += '  WhatsApp clicks: ' + summary.trends.whatsappClicks.current + '  (' + pctDisplay(summary.trends.whatsappClicks.percentChange) + ')\n';
  body += '  Orders:          ' + summary.trends.ordersSubmitted.current + '  (' + pctDisplay(summary.trends.ordersSubmitted.percentChange) + ')\n\n';

  // Funnel
  body += '🔁 FUNNEL STAGE BREAKDOWN (WhatsApp clicks)\n';
  ['top','middle','bottom'].forEach(function(stage) {
    var s = summary.funnel[stage];
    body += '  ' + stageEmoji(stage) + ' ' + stage.charAt(0).toUpperCase() + stage.slice(1) + ': ' + s.count + ' (' + s.stagePct + '%)\n';
  });
  body += '\n';

  // Top pages
  body += '📄 TOP PAGES\n';
  summary.topPages.forEach(function(p, i) {
    body += '  ' + (i+1) + '. ' + (p.page || '/') + ' — ' + p.views + ' views\n';
  });
  body += '\n';

  // Top tags
  body += '🔗 TOP WHATSAPP TAGS\n';
  summary.topTags.forEach(function(t, i) {
    body += '  ' + (i+1) + '. ' + t.tag + ' — ' + t.clicks + ' clicks\n';
  });
  body += '\n';

  // Orders
  body += '🛒 ORDER FUNNEL\n';
  body += '  Submitted: ' + summary.orders.submitted + '\n';
  body += '  Approved:  ' + summary.orders.approved + '\n';
  body += '  Rejected:  ' + summary.orders.rejected + '\n';
  body += '  Approval rate: ' + summary.orders.approvalRate + '%\n';
  if (Object.keys(summary.orders.rejectionReasons).length > 0) {
    body += '  Rejection reasons:\n';
    for (var reason in summary.orders.rejectionReasons) {
      if (summary.orders.rejectionReasons.hasOwnProperty(reason)) {
        body += '    · ' + reason + ': ' + summary.orders.rejectionReasons[reason] + '\n';
      }
    }
  }
  body += '\n';

  // ── Send ──
  var recipient = Session.getActiveUser().getEmail();
  MailApp.sendEmail({
    to: recipient,
    subject: 'Muscle OS — Weekly Summary (' + dateStr + ')',
    body: body
  });
}

function formatDateShort(d) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}
