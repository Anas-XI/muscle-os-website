// Playwright test: Google sign-in + one-time account-bound activation codes (training tool)
const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const PAGE_URL = 'file://E:/MoS/tools/training_tool.html';
const API = 'https://muscleos-access-control.muscleos.workers.dev';
const CLIENT_ID = '22648364020234-gldbcsfl16cftjvd11o9iqpalesi1hsn.apps.googleusercontent.com';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.setDefaultTimeout(45000);
  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

  const cfg = {
    googleEmail: 'user@gmail.com',
    googleName: 'Test User',
    googleSession: 'SESSION_JWT_1',
    subs: null, // account-bound subscriptions returned by the worker
    verify: (body) => {
      if (body.code === 'TRBOUND') return { valid: false, error: 'code_used_by_other' };
      if (body.code === 'TRDONE') return { valid: false, error: 'code_exhausted' };
      if (body.code === 'TRBAD') return { valid: false, error: 'invalid_code' };
      return { valid: true, plan: 'single_product', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), token: 'TOK_' + body.code };
    },
  };
  const apiCalls = [];

  // Google Identity Services mock (registered before any page script runs)
  await ctx.addInitScript({ content: `
    window.google = {
      accounts: {
        id: {
          initialize: (c) => { window.__gsiCfg = c; },
          renderButton: (el) => { el.setAttribute('data-rendered', '1'); },
          disableAutoSelect: () => {},
        }
      }
    };
  ` });

  await page.route('https://accounts.google.com/gsi/client', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* noop */' }));
  await page.route(API + '/**', async (route) => {
    const req = route.request();
    const body = JSON.parse(req.postData() || '{}');
    apiCalls.push({ url: req.url(), body });
    let resp;
    if (req.url().endsWith('/api/auth/google')) {
      resp = { valid: true, session: cfg.googleSession, email: cfg.googleEmail, name: cfg.googleName, subscriptions: cfg.subs || [] };
    } else if (req.url().endsWith('/api/check-session')) {
      resp = body.session === 'DEAD' ? { valid: false } : { valid: true, email: cfg.googleEmail, name: cfg.googleName, subscriptions: cfg.subs || [] };
    } else if (req.url().endsWith('/api/verify-code')) {
      resp = cfg.verify(body);
    } else {
      resp = { error: 'not_found' };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) });
  });

  const SUB_KEY = 'mos_subscription', GS_KEY = 'mos_google_session';
  const getLS = async (k) => page.evaluate((kk) => localStorage.getItem(kk), k);
  const overlayDisplay = async () => page.evaluate(() => document.getElementById('subOverlay').style.display);
  const stepDisplay = async (id) => page.evaluate((i) => document.getElementById(i).style.display, id);

  // ── T1: fresh load (no session, no sub) → overlay with code box + Google both visible ──
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('T1 overlay shown', (await overlayDisplay()) === 'flex');
  check('T1 code box visible immediately (no Google needed)', (await stepDisplay('authStep2')) === 'block');
  check('T1 Google option also visible', (await stepDisplay('authStep1')) === 'block');
  check('T1 GIS configured with client_id', await page.evaluate(() => window.__gsiCfg && window.__gsiCfg.client_id) === CLIENT_ID);
  check('T1 renderButton called', await page.evaluate(() => document.getElementById('googleSignInBtn').getAttribute('data-rendered')) === '1');
  check('T1 signed-in row hidden', await page.evaluate(() => document.getElementById('authWelcomeRow').style.display) === 'none');
  check('T1 switch link hidden', await page.evaluate(() => document.getElementById('subSignOut').style.display) === 'none');

  // ── T2: Google sign-in → step 2 with welcome, session stored ──
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'FAKE_CRED' }));
  await page.waitForFunction(() => document.getElementById('authStep2').style.display === 'block');
  check('T2 step2 visible after sign-in', true);
  check('T2 welcome shows name', await page.evaluate(() => document.getElementById('authWelcome').textContent) === 'Signed in as Test User');
  const gs = JSON.parse(await getLS(GS_KEY));
  check('T2 session stored', gs && gs.session === 'SESSION_JWT_1' && gs.email === 'user@gmail.com');
  check('T2 auth/google called with credential', apiCalls.some(c => c.url.endsWith('/api/auth/google') && c.body.token === 'FAKE_CRED'));

  // ── T3: valid code → grant, sub stored with email, request carried session ──
  await page.fill('#subCode', 'TRGOOD1');
  await page.click('#subVerify');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return s && s.active;
  });
  const sub = JSON.parse(await getLS(SUB_KEY));
  check('T3 sub active + plan', sub.active === true && sub.plan === 'single_product');
  check('T3 sub stores email', sub.email === 'user@gmail.com');
  check('T3 success shown', await page.evaluate(() => document.getElementById('subSuccess').style.display) === 'block');
  const vc = apiCalls.filter(c => c.url.endsWith('/api/verify-code'));
  check('T3 verify-code carried session JWT', vc.length === 1 && vc[0].body.session === 'SESSION_JWT_1' && vc[0].body.code === 'TRGOOD1');
  await page.waitForTimeout(1800); // let auto-reload finish
  check('T3 overlay hidden after reload (active)', (await overlayDisplay()) !== 'flex');

  // ── T4: stored session + valid check-session → straight to step 2 ──
  await page.evaluate((k) => localStorage.removeItem(k), SUB_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('authStep2').style.display === 'block');
  check('T4 returns to step 2 with stored session', true);
  check('T4 welcome shows stored name', await page.evaluate(() => document.getElementById('authWelcome').textContent) === 'Signed in as Test User');
  check('T4 signed-in row shown when linked', await page.evaluate(() => document.getElementById('authWelcomeRow').style.display) === 'block');
  check('T4 code box still visible when linked', (await stepDisplay('authStep2')) === 'block');

  // ── T5: sign out → session cleared, both sections stay visible ──
  await page.click('#subSignOut');
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  check('T5 Google option visible after sign-out', (await stepDisplay('authStep1')) === 'block');
  check('T5 code box still visible after sign-out', (await stepDisplay('authStep2')) === 'block');
  check('T5 welcome row hidden after sign-out', await page.evaluate(() => document.getElementById('authWelcomeRow').style.display) === 'none');
  check('T5 switch link hidden after sign-out', await page.evaluate(() => document.getElementById('subSignOut').style.display) === 'none');
  check('T5 session cleared', (await getLS(GS_KEY)) === null);

  // ── T6: bound-to-other error message ──
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'FAKE_CRED2' }));
  await page.waitForFunction(() => document.getElementById('authStep2').style.display === 'block');
  await page.fill('#subCode', 'TRBOUND');
  await page.click('#subVerify');
  await page.waitForFunction(() => document.getElementById('subError').style.display === 'block');
  check('T6 shows "linked to another account"', (await page.evaluate(() => document.getElementById('subError').textContent)).includes('already linked to another account'));

  // ── T7: exhausted code error message ──
  await page.fill('#subCode', 'TRDONE');
  await page.click('#subVerify');
  await page.waitForFunction(() => (document.getElementById('subError').textContent || '').includes('already been used'));
  check('T7 shows "already been used"', true);

  // ── T8: expired/invalid server session → cleared, back to step 1 ──
  await page.evaluate(() => localStorage.setItem('mos_google_session', JSON.stringify({ session: 'DEAD', email: 'user@gmail.com', name: 'Test User' })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  check('T8 invalid session -> step1', true);
  check('T8 invalid session cleared from storage', (await getLS(GS_KEY)) === null);
  check('T8 welcome row hidden', await page.evaluate(() => document.getElementById('authWelcomeRow').style.display) === 'none');

  // ── T9: owner email → instant grant, no verify-code call ──
  const vcBefore = apiCalls.filter(c => c.url.endsWith('/api/verify-code')).length;
  cfg.googleEmail = 'anasstem2025@gmail.com';
  cfg.googleName = 'Anas';
  cfg.googleSession = 'SESSION_OWNER';
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'OWNER_CRED' }));
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return s && s.active && s.email === 'anasstem2025@gmail.com';
  });
  const subO = JSON.parse(await getLS(SUB_KEY));
  check('T9 owner grant active, plan pro_training', subO.active === true && subO.plan === 'pro_training');
  check('T9 owner grant code OWNER', subO.code === 'OWNER');
  check('T9 no verify-code call for owner', apiCalls.filter(c => c.url.endsWith('/api/verify-code')).length === vcBefore);
  await page.waitForTimeout(1800);
  check('T9 overlay hidden after owner reload', (await overlayDisplay()) !== 'flex');

  // ── T10: legacy path — no session stored → session field absent from request ──
  await page.evaluate((k) => localStorage.removeItem(k), SUB_KEY);
  await page.evaluate((k) => localStorage.removeItem(k), GS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'X' })); // sign in again
  await page.waitForFunction(() => document.getElementById('authStep2').style.display === 'block');
  await page.evaluate((k) => localStorage.removeItem(k), GS_KEY); // simulate sessionless legacy flow
  await page.fill('#subCode', 'TRGOOD2');
  await page.click('#subVerify');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return s && s.active;
  });
  const lastVc = apiCalls.filter(c => c.url.endsWith('/api/verify-code')).pop();
  check('T10 legacy verify has no session field', lastVc && lastVc.body.session === undefined);
  check('T10 legacy grant works', (await overlayDisplay()) === 'flex' && await page.evaluate(() => document.getElementById('subSuccess').style.display) === 'block');

  // ── T11: bound code saved per account → Google sign-in auto-restores (no code entry) ──
  const RESTORE_CODE = { code: 'TRRESTORE', plan: 'single_product', products: ['training_tool'], expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
  cfg.googleEmail = 'subuser@gmail.com';
  cfg.googleName = 'Sub User';
  cfg.googleSession = 'SESSION_SUBUSER';
  cfg.subs = [RESTORE_CODE];
  await page.evaluate((k) => localStorage.removeItem(k), SUB_KEY);
  await page.evaluate((k) => localStorage.removeItem(k), GS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  const vcBeforeRestore = apiCalls.filter(c => c.url.endsWith('/api/verify-code')).length;
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'RESTORE_CRED' }));
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return s && s.active;
  });
  const subR = JSON.parse(await getLS(SUB_KEY));
  check('T11 auto-restore grants with bound code', subR.active === true && subR.code === 'TRRESTORE' && subR.email === 'subuser@gmail.com');
  check('T11 no verify-code call on restore', apiCalls.filter(c => c.url.endsWith('/api/verify-code')).length === vcBeforeRestore);
  await page.waitForTimeout(1800);
  check('T11 overlay hidden after restore reload', (await overlayDisplay()) !== 'flex');

  // ── T12: account with no bound code → hint shown, no grant ──
  cfg.subs = [];
  await page.evaluate((k) => localStorage.removeItem(k), SUB_KEY);
  await page.evaluate((k) => localStorage.removeItem(k), GS_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'NOLINK_CRED' }));
  await page.waitForFunction(() => document.getElementById('subNoLink').style.display === 'block');
  check('T12 no-link hint visible', true);
  check('T12 no grant without bound code', (await getLS(SUB_KEY)) === null);
  await page.evaluate(() => document.getElementById('subSignOut').click());
  await page.waitForFunction(() => document.getElementById('subNoLink').style.display === 'none');
  check('T12 hint hidden after sign-out', true);

  // ── T13: stored session + bound code → auto-restore on load (no sign-in click) ──
  cfg.googleEmail = 'subuser@gmail.com';
  cfg.subs = [RESTORE_CODE];
  await page.evaluate(() => {
    localStorage.setItem('mos_google_session', JSON.stringify({ session: 'SESSION_SUBUSER', email: 'subuser@gmail.com', name: 'Sub User', ts: Date.now() }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return s && s.active && s.code === 'TRRESTORE';
  });
  check('T13 stored-session restore grants on load', true);
  await page.waitForTimeout(1800);
  check('T13 overlay hidden after restore', (await overlayDisplay()) !== 'flex');
  check('T13 restore fires no verify-code call', apiCalls.filter(c => c.url.endsWith('/api/verify-code')).length === vcBeforeRestore);

  // ── Console errors ──
  check('No page errors', errors.length === 0);
  if (errors.length) console.log('  errors:', errors);

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
