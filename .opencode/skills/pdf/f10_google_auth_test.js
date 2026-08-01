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
      resp = { valid: true, session: cfg.googleSession, email: cfg.googleEmail, name: cfg.googleName };
    } else if (req.url().endsWith('/api/check-session')) {
      resp = body.session === 'DEAD' ? { valid: false } : { valid: true, email: cfg.googleEmail, name: cfg.googleName };
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

  // ── T1: fresh load (no session, no sub) → overlay + step 1, GIS initialized ──
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('T1 overlay shown', (await overlayDisplay()) === 'flex');
  check('T1 step1 visible', (await stepDisplay('authStep1')) === 'block');
  check('T1 step2 hidden', (await stepDisplay('authStep2')) === 'none');
  check('T1 GIS configured with client_id', await page.evaluate(() => window.__gsiCfg && window.__gsiCfg.client_id) === CLIENT_ID);
  check('T1 renderButton called', await page.evaluate(() => document.getElementById('googleSignInBtn').getAttribute('data-rendered')) === '1');

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

  // ── T5: sign out → back to step 1, session cleared ──
  await page.click('#subSignOut');
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  check('T5 step1 visible after sign-out', true);
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

  // ── Console errors ──
  check('No page errors', errors.length === 0);
  if (errors.length) console.log('  errors:', errors);

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
