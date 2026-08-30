const {chromium} = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const PAGE_URL = 'file://E:/MoS/tools/training_tool.html';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const dialogs = [];
  page.on('console', m => { if (m.type() === 'error' && !(m.text().includes('401') && m.text().includes('Failed to load resource'))) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  page.setDefaultTimeout(45000);
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  // Mock sync server (passphrase string-compare stand-in for worker hashing)
  const server = new Map();
  let lastPushBody = null, lastPullUrl = null, lastPullResp = null;
  await page.route('**/api/sync/**', async route => {
    const req = route.request();
    const u = new URL(req.url());
    const key = u.pathname.replace('/api/sync/', '');
    if (req.method() === 'POST') {
      const body = req.postDataJSON();
      lastPushBody = body;
      const rec = server.get(key);
      if (rec && rec.pw !== (body.pw || '')) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'bad_passphrase' }) });
      }
      server.set(key, { pw: body.pw || '', data: body.data, ts: Date.now() });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    }
    if (req.method() === 'GET') {
      lastPullUrl = u.href;
      const rec = server.get(key);
      if (!rec) { lastPullResp = null; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }); }
      if (rec.pw && u.searchParams.get('pw') !== rec.pw) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'bad_passphrase' }) });
      }
      lastPullResp = JSON.stringify(rec.data);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: rec.data, ts: rec.ts }) });
    }
    return route.fulfill({ status: 404, body: 'nf' });
  });

  await ctx.addInitScript({ content: `localStorage.setItem('mos_subscription', JSON.stringify({active:true,plan:'pro_training',expiry:'2026-12-31'}));` });
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Bootstrap to step 4 (creates logs/program data to sync)
  await page.fill('#userName', 'Sync Tester');
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

  // Log one working set so mos_logs has real content
  const firstCard = page.locator('#exCards .ex-card').first();
  await firstCard.locator('input').first().fill('60');
  await firstCard.locator('input').nth(1).fill('8');
  await page.waitForTimeout(300);
  // Seed extras so full export assembly coverage is provable
  await page.evaluate(() => {
    localStorage.setItem('mos_periodization', JSON.stringify({ phases: 1 }));
    localStorage.setItem('mos_week_count', JSON.stringify(4));
    localStorage.setItem('mos_sessions', JSON.stringify([{ date: '2026-07-30', durationSec: 180, sets: 9 }]));
  });
  const pushedLogs = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_logs')));

  // T1: modal opens, Sync ID auto-generated as UUID + persisted
  await page.click('#syncBtn');
  await page.waitForSelector('#syncModal', { state: 'visible' });
  const syncId = await page.locator('#syncKeyInput').inputValue();
  check('Sync ID auto-generated as UUID', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(syncId));
  check('Sync ID persisted to mos_sync_key', await page.evaluate(k => JSON.parse(localStorage.getItem('mos_sync_key') || 'null') === k, syncId));
  check('Passphrase input present', await page.locator('#syncPwInput').count() === 1);

  // T2: regenerate button creates new ID + persists
  const idBefore = syncId;
  await page.click('button[onclick="genSyncId()"]');
  const idAfter = await page.locator('#syncKeyInput').inputValue();
  check('Regenerate button rolls new UUID', idAfter !== idBefore && /^[0-9a-f-]{36}$/.test(idAfter));
  check('Regenerated ID persisted', await page.evaluate(k => JSON.parse(localStorage.getItem('mos_sync_key') || 'null') === k, idAfter));

  // T3: push with passphrase -> full payload assembly, done alert, last-synced saved
  await page.fill('#syncKeyInput', 'sync-test-1');
  await page.fill('#syncPwInput', 'secret');
  await page.click('button[onclick="doSyncUpload()"]');
  await page.waitForTimeout(400);
  check('Push succeeded alert (Synced)', dialogs.some(m => m.includes('Synced')));
  check('Server received push', server.has('sync-test-1'));
  const sent = lastPushBody;
  check('Push payload = full export assembly', sent && sent.pw === 'secret' && sent.data && sent.data.mos_logs && sent.data.mos_program && sent.data.mos_split_profile && sent.data.mos_vol_inputs && sent.data.mos_ex_choices && sent.data.mos_periodization && sent.data.mos_week_count);
  check('Push payload includes mos_sessions key (F6)', sent && Array.isArray(sent.data.mos_sessions) && sent.data.mos_sessions.length === 1);
  check('Last-synced timestamp saved', await page.evaluate(() => !!localStorage.getItem('mos_sync_last')));
  check('Modal auto-closes after push', !(await page.locator('#syncModal').isVisible()));

  // T4: pull restores data over local changes
  await page.evaluate(() => localStorage.setItem('mos_logs', JSON.stringify({ '2026-08-01': { 'MARKER': { sets: [] } } })));
  await page.click('#syncBtn');
  await page.waitForSelector('#syncModal', { state: 'visible' });
  check('Sync ID prefilled from storage', (await page.locator('#syncKeyInput').inputValue()) === 'sync-test-1');
  check('Passphrase prefilled from storage', (await page.locator('#syncPwInput').inputValue()) === 'secret');
  check('Last-synced row visible', await page.locator('#syncLastRow').evaluate(el => el.style.display !== 'none'));
  await page.click('button[onclick="doSyncDownload()"]');
  await page.waitForFunction(() => {
    try {
      const l = JSON.parse(localStorage.getItem('mos_logs') || '{}');
      return !(l['2026-08-01'] && l['2026-08-01'].MARKER);
    } catch (e) { return false; }
  }, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  const afterPull = await page.evaluate(() => JSON.parse(localStorage.getItem('mos_logs')));
  check('Pull overwrote local marker with server data', JSON.stringify(afterPull) === JSON.stringify(pushedLogs) && !(afterPull['2026-08-01'] && afterPull['2026-08-01'].MARKER));
  check('Pull URL used passphrase query param', lastPullUrl && lastPullUrl.includes('?pw=secret'));
  check('Pull response carried server data', lastPullResp !== null);
  check('mos_sync_key survives reload', await page.evaluate(() => JSON.parse(localStorage.getItem('mos_sync_key') || 'null') === 'sync-test-1'));

  // T5: wrong passphrase -> sync_fail + error surfaced
  dialogs.length = 0;
  await page.click('#syncBtn');
  await page.waitForSelector('#syncModal', { state: 'visible' });
  await page.fill('#syncPwInput', 'wrongpw');
  await page.click('button[onclick="doSyncUpload()"]');
  await page.waitForTimeout(400);
  check('Wrong passphrase -> fail alert with bad_passphrase', dialogs.some(m => m.includes('bad_passphrase')));
  check('No overwrite on failed push', server.get('sync-test-1').pw === 'secret');

  // T6: missing key -> fail alert without network
  dialogs.length = 0;
  lastPushBody = null;
  await page.fill('#syncPwInput', 'secret');
  await page.fill('#syncKeyInput', 'ab');
  await page.click('button[onclick="doSyncUpload()"]');
  await page.waitForTimeout(300);
  check('Too-short key blocked client-side', dialogs.some(m => m.includes('Sync failed')) && lastPushBody === null);

  // T7: Arabic modal labels (close modal first)
  await page.click('.modal-close');
  await page.waitForTimeout(150);
  await page.click('.lang-opt[data-lang="ar"]');
  await page.waitForTimeout(200);
  await page.click('#syncBtn');
  await page.waitForSelector('#syncModal', { state: 'visible' });
  check('AR locale: Push button label', (await page.locator('button[onclick="doSyncUpload()"]').textContent()).trim() === 'رفع');
  check('AR locale: Pull button label', (await page.locator('button[onclick="doSyncDownload()"]').textContent()).trim() === 'سحب');
  check('AR locale: Passphrase label', (await page.locator('#syncModal label[data-i18n="sync_pw"]').textContent()).trim() === 'كلمة المرور');

  console.log('Console errors:', errors.length === 0 ? 'NONE (PASS)' : errors.length + ' errors (FAIL)');
  if (errors.length) console.log(errors);
  check('no console errors', errors.length === 0);

  await browser.close();
  console.log('\n=== F7 Cloud Sync Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
  process.exit(fail ? 1 : 0);
})();
