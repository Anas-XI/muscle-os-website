// Worker unit-check for Google-account-bound activation codes (node, in-memory mocks)
import workerMod from 'file:///E:/MoS/website/worker/src/index.js';
import { createHmac } from 'node:crypto';

const SECRET = 'test-secret';

// ── Session JWT minting (mirrors handleGoogleAuth output) ──
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function mintSession(email, { type = 'session', expDelta = 7 * 86400 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ type, email, name: 'Tester', googleSub: 'g123', iss: 'muscleos-access-control', aud: 'muscleos-website', sub: email, iat: now, exp: now + expDelta });
  const sig = createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + sig;
}

// ── Mock Durable Object (mirrors CodeCounter record checks) ──
function makeDoCounter(doRecords, kv) {
  return {
    idFromName(name) { return { name }; },
    get(id) {
      return {
        async fetch(url, opts) {
          const rec = () => doRecords.get(id.name) || null;
          if (url.includes('/inspect')) {
            return new Response(JSON.stringify({ record: rec() || null }), { status: 200 });
          }
          if (url.includes('/initialize')) {
            const b = JSON.parse(opts.body);
            doRecords.set(id.name, b);
            return new Response('ok', { status: 200 });
          }
          if (url.includes('/verify')) {
            const b = JSON.parse(opts.body);
            const r = rec();
            const err = (error, status) => new Response(JSON.stringify({ valid: false, error }), { status, headers: { 'Content-Type': 'application/json' } });
            if (!r) return err('invalid_code', 401);
            if (r.uses === -1) return err('code_revoked', 401);
            if (r.products !== 'all' && !r.products.includes(b.productId)) return err('wrong_product', 403);
            if (r.expiresAt && Date.now() > new Date(r.expiresAt).getTime()) return err('code_expired', 401);
            if (r.maxUses && (r.uses || 0) >= r.maxUses) return err('code_exhausted', 401);
            r.uses = (r.uses || 0) + 1;
            doRecords.set(id.name, r);
            return new Response(JSON.stringify({ valid: true, uses: r.uses, plan: r.plan, durationDays: r.durationDays || 30, products: r.products }), { status: 200 });
          }
          return new Response('Not found', { status: 404 });
        }
      };
    }
  };
}

function makeEnv() {
  const kv = new Map();
  const doRecords = new Map();
  const env = {
    JWT_SECRET: SECRET,
    ACCESS_CODES: {
      async put(k, v, o) { kv.set(k, v); },
      async get(k, type) { const v = kv.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
      async list() { return { keys: [] }; },
    },
    CODE_COUNTER: makeDoCounter(doRecords, kv),
  };
  return { env, kv, doRecords };
}

const seed = (doRecords, code, rec) => doRecords.set(code, rec);
const TR = { products: ['training_tool'], plan: 'single_product', durationDays: 30, uses: 0 };

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

let ip = 0;
const post = (path, body, env) => workerMod.fetch(new Request('https://x.dev' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.' + (++ip) },
  body: JSON.stringify(body),
}), env);

const A = mintSession('user@gmail.com');
const B = mintSession('other@gmail.com');

// 1. First activation with Google session → valid + binding written + use consumed
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND1', { ...TR });
  let r = await post('/api/verify-code', { code: 'trbnd1', productId: 'training_tool', session: A }, env);
  let j = await r.json();
  check('1. first activation with session -> 200 valid', r.status === 200 && j.valid === true);
  const binding = JSON.parse(kv.get('code:TRBND1:binding'));
  check('1. binding written with email', binding && binding.email === 'user@gmail.com' && !!binding.expiresAt);
  check('1. DO use consumed exactly once', doRecords.get('TRBND1').uses === 1);
}

// 2. Same account re-activating → idempotent valid, no re-consumption
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND2', { ...TR });
  await post('/api/verify-code', { code: 'trbnd2', productId: 'training_tool', session: A }, env);
  let r = await post('/api/verify-code', { code: 'trbnd2', productId: 'training_tool', session: A }, env);
  let j = await r.json();
  check('2. same account re-activation -> 200 valid', r.status === 200 && j.valid === true && j.boundEmail === 'user@gmail.com');
  check('2. use NOT re-consumed (stays 1)', doRecords.get('TRBND2').uses === 1);
}

// 3. Different account trying a bound code → 403 code_used_by_other, use unchanged
{
  const { env, doRecords } = makeEnv();
  seed(doRecords, 'TRBND3', { ...TR });
  await post('/api/verify-code', { code: 'trbnd3', productId: 'training_tool', session: A }, env);
  let r = await post('/api/verify-code', { code: 'trbnd3', productId: 'training_tool', session: B }, env);
  let j = await r.json();
  check('3. different account -> 403 code_used_by_other', r.status === 403 && j.error === 'code_used_by_other');
  check('3. use unchanged after rejection', doRecords.get('TRBND3').uses === 1);
}

// 4. Legacy path: no session → still valid, no binding written
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND4', { ...TR });
  let r = await post('/api/verify-code', { code: 'trbnd4', productId: 'training_tool' }, env);
  let j = await r.json();
  check('4. no-session activation -> 200 valid', r.status === 200 && j.valid === true);
  check('4. no binding key written', kv.get('code:TRBND4:binding') === undefined);
  check('4. use consumed once', doRecords.get('TRBND4').uses === 1);
}

// 5. One-time code (maxUses=1) bound to A: A reactivates fine, B is blocked by binding (not exhaustion)
{
  const { env, doRecords } = makeEnv();
  seed(doRecords, 'TRBND5', { ...TR, maxUses: 1 });
  let r = await post('/api/verify-code', { code: 'trbnd5', productId: 'training_tool', session: A }, env);
  check('5. A activates one-time code -> 200', r.status === 200);
  r = await post('/api/verify-code', { code: 'trbnd5', productId: 'training_tool', session: A }, env);
  check('5. A re-activates same one-time code -> idempotent 200', r.status === 200 && (await r.json()).valid === true);
  r = await post('/api/verify-code', { code: 'trbnd5', productId: 'training_tool', session: B }, env);
  check('5. B blocked -> 403 code_used_by_other', r.status === 403 && (await r.json()).error === 'code_used_by_other');
  check('5. use never exceeds 1', doRecords.get('TRBND5').uses === 1);
}

// 6. One-time code without binding: second verify → code_exhausted
{
  const { env, doRecords } = makeEnv();
  seed(doRecords, 'TRBND6', { ...TR, maxUses: 1 });
  let r = await post('/api/verify-code', { code: 'trbnd6', productId: 'training_tool' }, env);
  check('6. sessionless first use -> 200', r.status === 200);
  r = await post('/api/verify-code', { code: 'trbnd6', productId: 'training_tool' }, env);
  check('6. second use -> 401 code_exhausted', r.status === 401 && (await r.json()).error === 'code_exhausted');
}

// 7. Tampered / invalid session token → 401 invalid_session
{
  const { env, doRecords } = makeEnv();
  seed(doRecords, 'TRBND7', { ...TR });
  let r = await post('/api/verify-code', { code: 'trbnd7', productId: 'training_tool', session: 'garbage.token.here' }, env);
  check('7. invalid session -> 401 invalid_session', r.status === 401 && (await r.json()).error === 'invalid_session');
  check('7. no use consumed', doRecords.get('TRBND7').uses === 0);
}

// 8. Wrong claim type in session → rejected
{
  const { env, doRecords } = makeEnv();
  seed(doRecords, 'TRBND8', { ...TR });
  const productToken = mintSession('user@gmail.com', { type: 'product' });
  let r = await post('/api/verify-code', { code: 'trbnd8', productId: 'training_tool', session: productToken }, env);
  check('8. product-type token as session -> 401 invalid_session', r.status === 401 && (await r.json()).error === 'invalid_session');
}

// 9. Stored binding whose expiry passed → idempotent path returns code_expired
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND9', { ...TR });
  kv.set('code:TRBND9:binding', JSON.stringify({ email: 'user@gmail.com', expiresAt: new Date(Date.now() - 86400000).toISOString(), plan: 'single_product', ts: Date.now() }));
  let r = await post('/api/verify-code', { code: 'trbnd9', productId: 'training_tool', session: A }, env);
  check('9. expired binding -> 401 code_expired', r.status === 401 && (await r.json()).error === 'code_expired');
}

// 10. Bound code + lazy migration: binding exists, DO empty, KV has record → migrated & idempotent valid
{
  const { env, kv, doRecords } = makeEnv();
  kv.set('code:TRBND10', JSON.stringify({ ...TR }));
  kv.set('code:TRBND10:binding', JSON.stringify({ email: 'user@gmail.com', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), plan: 'single_product', ts: Date.now() }));
  let r = await post('/api/verify-code', { code: 'trbnd10', productId: 'training_tool', session: A }, env);
  let j = await r.json();
  check('10. bound code with KV-only record -> 200 valid via lazy migration', r.status === 200 && j.valid === true);
  check('10. DO record created by migration', doRecords.get('TRBND10') !== undefined);
  check('10. no use consumed on reactivation', doRecords.get('TRBND10').uses === 0);
}

// 11. Revoked bound code → rejected even for the bound account
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND11', { ...TR, uses: -1 });
  kv.set('code:TRBND11:binding', JSON.stringify({ email: 'user@gmail.com', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), plan: 'single_product', ts: Date.now() }));
  let r = await post('/api/verify-code', { code: 'trbnd11', productId: 'training_tool', session: A }, env);
  check('11. revoked bound code -> 401 code_revoked', r.status === 401 && (await r.json()).error === 'code_revoked');
}

// 12. First activation with session writes the per-account index (email:<email>:subs)
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND12', { ...TR });
  let r = await post('/api/verify-code', { code: 'trbnd12', productId: 'training_tool', session: A }, env);
  check('12. activation with session -> 200 valid', r.status === 200);
  const idx = JSON.parse(kv.get('email:user@gmail.com:subs'));
  check('12. account index written with code+plan+products+expiresAt',
    Array.isArray(idx) && idx.length === 1 && idx[0].code === 'TRBND12' &&
    idx[0].plan === 'single_product' && Array.isArray(idx[0].products) &&
    idx[0].products.includes('training_tool') && !!idx[0].expiresAt);
  seed(doRecords, 'TRBND12L', { ...TR });
  await post('/api/verify-code', { code: 'trbnd12l', productId: 'training_tool' }, env);
  const idx2 = JSON.parse(kv.get('email:user@gmail.com:subs'));
  check('12. sessionless activation NOT indexed (still 1 entry)', idx2.length === 1 && idx2[0].code === 'TRBND12');
}

// 13. check-session returns the account's active subscriptions
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND13', { ...TR });
  await post('/api/verify-code', { code: 'trbnd13', productId: 'training_tool', session: A }, env);
  let r = await post('/api/check-session', { session: A }, env);
  let j = await r.json();
  check('13. check-session valid', r.status === 200 && j.valid === true && j.email === 'user@gmail.com');
  check('13. subscriptions include bound code',
    Array.isArray(j.subscriptions) && j.subscriptions.length === 1 &&
    j.subscriptions[0].code === 'TRBND13' && j.subscriptions[0].products.includes('training_tool'));
  let rB = await post('/api/check-session', { session: B }, env);
  let jB = await rB.json();
  check('13. other account -> empty subscriptions', Array.isArray(jB.subscriptions) && jB.subscriptions.length === 0);
}

// 14. Re-activation refreshes the index without duplicating the entry
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND14', { ...TR });
  await post('/api/verify-code', { code: 'trbnd14', productId: 'training_tool', session: A }, env);
  await post('/api/verify-code', { code: 'trbnd14', productId: 'training_tool', session: A }, env);
  const idx = JSON.parse(kv.get('email:user@gmail.com:subs'));
  check('14. re-activation keeps single index entry', Array.isArray(idx) && idx.length === 1 && idx[0].code === 'TRBND14');
}

// 15. Expired index entries are filtered out of check-session
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND15', { ...TR });
  kv.set('email:user@gmail.com:subs', JSON.stringify([
    { code: 'TREXPIRED', plan: 'single_product', products: ['training_tool'], expiresAt: new Date(Date.now() - 86400000).toISOString(), ts: Date.now() },
    { code: 'TRBND15', plan: 'single_product', products: ['training_tool'], expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(), ts: Date.now() }
  ]));
  let r = await post('/api/check-session', { session: A }, env);
  let j = await r.json();
  check('15. expired filtered, active kept', Array.isArray(j.subscriptions) && j.subscriptions.length === 1 && j.subscriptions[0].code === 'TRBND15');
}

// 16. Revoked bound code still listed? No — revoked codes are rejected at verify; index restore only cares about active expiry
{
  const { env, kv, doRecords } = makeEnv();
  seed(doRecords, 'TRBND16', { ...TR });
  kv.set('email:user@gmail.com:subs', JSON.stringify([
    { code: 'TRBND16', plan: 'single_product', products: ['training_tool'], expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), ts: Date.now() }
  ]));
  // master-plan ('all') subscription also restorable for any product
  kv.set('email:other@gmail.com:subs', JSON.stringify([
    { code: 'TRMASTER', plan: 'master', products: 'all', expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), ts: Date.now() }
  ]));
  let r = await post('/api/check-session', { session: B }, env);
  let j = await r.json();
  check('16. master/all subscription returned for any product', Array.isArray(j.subscriptions) && j.subscriptions[0].products === 'all');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
