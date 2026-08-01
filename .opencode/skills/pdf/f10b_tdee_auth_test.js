// Playwright test: Google sign-in + one-time bound codes (TDEE tool) + legacy hole closed
const { chromium } = require('E:/MoS/.opencode/skills/pdf/node_modules/playwright');

const PAGE_URL = 'file://E:/MoS/tools/tdee_adaptive_engine.html';
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
      if (body.code === 'TDBAD6') return { valid: false, error: 'invalid_code' };
      return { valid: true, plan: 'single_product', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), token: 'TOK_' + body.code };
    },
  };
  const apiCalls = [];

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
      resp = { valid: true, email: cfg.googleEmail, name: cfg.googleName };
    } else if (req.url().endsWith('/api/verify-code')) {
      resp = cfg.verify(body);
    } else {
      resp = { error: 'not_found' };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) });
  });

  const getLS = async (k) => page.evaluate((kk) => localStorage.getItem(kk), k);

  // T1: fresh load → overlay, step1, GIS
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('T1 overlay shown', await page.evaluate(() => document.getElementById('subOverlay').style.display) === 'flex');
  check('T1 step1 visible', await page.evaluate(() => document.getElementById('authStep1').style.display) === 'block');
  check('T1 GIS client_id', await page.evaluate(() => window.__gsiCfg && window.__gsiCfg.client_id) === CLIENT_ID);

  // T2: sign in → step2 + session stored
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'FAKE_CRED' }));
  await page.waitForFunction(() => document.getElementById('authStep2').style.display === 'block');
  check('T2 step2 after sign-in', true);
  check('T2 session stored', (await page.evaluate(() => localStorage.getItem('mos_google_session'))).includes('SESSION_JWT_1'));

  // T3: valid code → grant, productId correct, session carried
  await page.fill('#subCode', 'TDGOOD1');
  await page.click('#subVerify');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return s && s.active;
  });
  const sub = JSON.parse(await getLS('mos_subscription'));
  check('T3 sub active + email', sub.active === true && sub.email === 'user@gmail.com');
  const vc = apiCalls.filter(c => c.url.endsWith('/api/verify-code'));
  check('T3 productId = tdee_adaptive_engine + session', vc.length === 1 && vc[0].body.productId === 'tdee_adaptive_engine' && vc[0].body.session === 'SESSION_JWT_1');
  await page.waitForTimeout(1800);

  // T4: legacy hole closed — 6-char garbage code no longer grants locally
  await page.evaluate((k) => localStorage.removeItem(k), 'mos_subscription');
  await page.evaluate((k) => localStorage.removeItem(k), 'mos_google_session');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('authStep1').style.display === 'block');
  await page.evaluate(() => window.__gsiCfg.callback({ credential: 'X' }));
  await page.waitForFunction(() => document.getElementById('authStep2').style.display === 'block');
  await page.fill('#subCode', 'TDBAD6');
  await page.click('#subVerify');
  await page.waitForFunction(() => document.getElementById('subError').style.display === 'block');
  const stillInactive = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('mos_subscription') || 'null');
    return !s || !s.active;
  });
  check('T4 6-char garbage code rejected (hole closed)', stillInactive === true);
  check('T4 error visible', true);

  check('No page errors', errors.length === 0);
  if (errors.length) console.log('  errors:', errors);

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
