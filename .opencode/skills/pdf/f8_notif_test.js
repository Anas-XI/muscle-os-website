const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const PAGE_URL = 'file://E:/MoS/tools/training_tool.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const dialogs = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  page.setDefaultTimeout(45000);
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  // Notification stub: capture constructor calls, permission controllable
  await ctx.addInitScript({ content: `
    window.__notifShown = [];
    window.Notification = function(title, opts){ window.__notifShown.push({ title: title, body: (opts&&opts.body)||'', icon: (opts&&opts.icon)||'' }); };
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = function(){ return Promise.resolve('granted'); };
    localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));
  ` });
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Bootstrap to step 4 without logging any set (mos_logs empty -> first training day)
  await page.fill('#userName', 'Notif Tester');
  await page.fill('#userAge', '25');
  await page.selectOption('#ta', 'intermediate');
  await page.selectOption('#goal', 'hypertrophy');
  await page.selectOption('#dow', '3');
  await page.selectOption('#recFactor', 'moderate');
  await page.click('#onboardNext');
  await page.waitForSelector('#step2.active');
  await page.click('#splitGrid .split-card[data-key="fullbody_3"]');
  await page.click('#genProgBtn');
  await page.waitForSelector('#exSelPanel.show');
  await page.click('#confirmExBtn');
  await page.waitForSelector('#step3.active');
  await page.click('#saveProgBtn');
  await page.waitForTimeout(400);
  await page.click('#startTrainingBtn');
  await page.waitForSelector('#step4.active');
  await page.waitForSelector('#exCards .ex-card');

  // T1: initial off state
  check('Toggle initially off label', (await page.locator('#notifToggleLabel').textContent()) === 'Training reminders off');
  check('mos_notif_on unset', await page.evaluate(() => localStorage.getItem('mos_notif_on') === null));

  // T2: enable -> label on, flag persisted, auto-check fires (hour threshold 0 = always passed)
  await page.evaluate(() => localStorage.setItem('mos_notif_hour', '0'));
  await page.click('#notifToggle');
  await page.waitForTimeout(200);
  check('Toggle flips to on label', (await page.locator('#notifToggleLabel').textContent()) === 'Training reminders on');
  check('Toggle gets .on class', await page.locator('#notifToggle').evaluate(el => el.classList.contains('on')));
  check('mos_notif_on persisted true', await page.evaluate(() => JSON.parse(localStorage.getItem('mos_notif_on') || 'false') === true));
  const n1 = await page.evaluate(() => window.__notifShown.length);
  check('Auto-check fired notification on enable', n1 === 1);

  // T3: notification payload matches spec
  const n = await page.evaluate(() => window.__notifShown[0]);
  check('Notif title = Training Day', n.title === 'Training Day');
  check('Notif body = Push is on deck', n.body === 'Push is on deck');
  check('Notif uses manifest icon', n.icon === 'icons/icon-192.png');
  const today = new Date().toISOString().split('T')[0];
  check('mos_notif_last = today', await page.evaluate(t => JSON.parse(localStorage.getItem('mos_notif_last') || 'null') === t, today));

  // T4: dedupe — second check shows nothing
  await page.evaluate(() => window.__notifCheck());
  await page.waitForTimeout(150);
  check('No duplicate notification (dedupe)', await page.evaluate(() => window.__notifShown.length === 1));

  // T5: clear last -> check fires again (proves re-check path)
  await page.evaluate(() => localStorage.removeItem('mos_notif_last'));
  await page.evaluate(() => window.__notifCheck());
  await page.waitForTimeout(150);
  check('Check after clearing last fires again', await page.evaluate(() => window.__notifShown.length === 2));

  // T6: toggle off -> no notifications
  await page.click('#notifToggle');
  await page.waitForTimeout(150);
  check('Toggle back to off label', (await page.locator('#notifToggleLabel').textContent()) === 'Training reminders off');
  await page.evaluate(() => localStorage.removeItem('mos_notif_last'));
  await page.evaluate(() => window.__notifCheck());
  await page.waitForTimeout(150);
  check('No notification when disabled', await page.evaluate(() => window.__notifShown.length === 2));

  // T7: permission denied -> blocked alert, flag stays off
  await page.evaluate(() => { Notification.permission = 'denied'; });
  dialogs.length = 0;
  await page.click('#notifToggle');
  await page.waitForTimeout(200);
  check('Denied permission -> blocked alert', dialogs.some(m => m.includes('blocked')));
  check('Flag stays off when denied', await page.evaluate(() => JSON.parse(localStorage.getItem('mos_notif_on') || 'false') === false));

  // T8: already-trained-today -> not a notification day
  await page.evaluate(() => { Notification.permission = 'granted'; localStorage.setItem('mos_notif_on', 'true'); });
  await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('mos_program'));
    const day = prog.days[0];
    const ex = day.ex[0].n;
    const t = new Date().toISOString().split('T')[0];
    const logs = {};
    logs[t] = {};
    logs[t][day.n + '__' + ex] = { sets: [{ w: 60, r: 8, rpe: 8 }] };
    localStorage.setItem('mos_logs', JSON.stringify(logs));
    localStorage.removeItem('mos_notif_last');
  });
  await page.evaluate(() => window.__notifCheck());
  await page.waitForTimeout(150);
  check('No notification on already-logged training day', await page.evaluate(() => window.__notifShown.length === 2));

  // T9: Arabic labels
  await page.evaluate(() => { localStorage.removeItem('mos_notif_on'); });
  await page.click('.lang-opt[data-lang="ar"]');
  await page.waitForTimeout(200);
  check('AR locale: off label', (await page.locator('#notifToggleLabel').textContent()) === 'تذكيرات التمرين متوقفة');
  await page.click('#notifToggle');
  await page.waitForTimeout(150);
  check('AR locale: on label', (await page.locator('#notifToggleLabel').textContent()) === 'تذكيرات التمرين مفعلة');

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F8 Notifications Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();
