// Worker unit-check for F7 sync endpoints (node, in-memory KV mock)
import workerMod from 'file:///E:/MoS/website/worker/src/index.js';

const worker = workerMod;
const kv = new Map();
const env = {
  ACCESS_CODES: {
    async put(k, v, o) { kv.set(k, v); },
    async get(k, type) { const v = kv.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    async list() { return { keys: [] }; },
  },
};

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };

const post = (path, body) => worker.fetch(new Request('https://x.dev' + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), env);
const get = (path) => worker.fetch(new Request('https://x.dev' + path, { method: 'GET' }), env);

// 1. push with passphrase
let r = await post('/api/sync/test-key-1', { pw: 'secret', data: { a: 1, logs: { x: 1 } } });
check('POST /api/sync/:key with pw -> 200 ok', r.status === 200 && (await r.json()).status === 'ok');

// 2. push with wrong passphrase -> 401
r = await post('/api/sync/test-key-1', { pw: 'nope', data: { a: 2 } });
check('POST wrong passphrase -> 401 bad_passphrase', r.status === 401 && (await r.json()).error === 'bad_passphrase');

// 3. push without passphrase when guarded -> 401
r = await post('/api/sync/test-key-1', { pw: '', data: { a: 2 } });
check('POST empty passphrase on guarded key -> 401', r.status === 401);

// 4. pull with correct passphrase -> data round-trips
r = await get('/api/sync/test-key-1?pw=secret');
let j = await r.json();
check('GET with correct pw -> 200 + data round-trip', r.status === 200 && j.data && j.data.a === 1 && j.data.logs.x === 1);

// 5. pull with wrong passphrase -> 401
r = await get('/api/sync/test-key-1?pw=wrong');
check('GET wrong pw -> 401', r.status === 401);

// 6. pull without passphrase on guarded key -> 401
r = await get('/api/sync/test-key-1');
check('GET no pw on guarded key -> 401', r.status === 401);

// 7. passphrase protected from re-use: stored hash is not plaintext
import { createHash } from 'node:crypto';
const expectedHash = createHash('sha256').update('secret').digest('hex');
const raw = kv.get('sync:test-key-1:meta');
const parsedMeta = JSON.parse(raw);
check('Stored meta contains SHA-256 hash, not plaintext', parsedMeta.pwHash === expectedHash && !raw.includes('secret'));

// 8. no-passphrase key: push + pull work without pw
r = await post('/api/sync/test-key-2', { pw: '', data: { hello: 'world' } });
check('POST unguarded key without pw -> 200', r.status === 200);
r = await get('/api/sync/test-key-2');
j = await r.json();
check('GET unguarded key without pw -> 200 + data', r.status === 200 && j.data.hello === 'world');

// 9. push updates data, pull reflects update
r = await post('/api/sync/test-key-1', { pw: 'secret', data: { a: 42 } });
check('POST update guarded key -> 200', r.status === 200);
r = await get('/api/sync/test-key-1?pw=secret');
j = await r.json();
check('Pull reflects updated data', j.data.a === 42);

// 10. oversize payload -> 413
const big = { blob: 'x'.repeat(1_050_000) };
r = await post('/api/sync/test-key-3', { pw: '', data: big });
check('Oversize payload -> 413 data_too_large', r.status === 413 && (await r.json()).error === 'data_too_large');

// 11. invalid keys -> 400
r = await post('/api/sync/ab', { pw: '', data: { a: 1 } });
check('Too-short key -> 400', r.status === 400);
r = await post('/api/sync/%23%23%23%23', { pw: '', data: { a: 1 } });
check('Percent-encoded key sanitizes to digits (accepted as alnum)', r.status === 200);
r = await post('/api/sync/@@@@', { pw: '', data: { a: 1 } });
check('Sanitized-empty key -> 400', r.status === 400);

// 12. old endpoints still work (backward compat)
r = await post('/api/sync/save', { key: 'oldkey-123', data: { logs: 1 } });
check('Legacy POST /api/sync/save still works', r.status === 200);
r = await post('/api/sync/load', { key: 'oldkey-123' });
j = await r.json();
check('Legacy POST /api/sync/load returns data', r.status === 200 && j.data.logs === 1);

// 13. pull with no pw on unguarded key returns data even with ?pw= (ignored when no guard)
r = await get('/api/sync/test-key-2?pw=whatever');
j = await r.json();
check('Extra pw ignored on unguarded key', r.status === 200 && j.data.hello === 'world');

console.log('\n=== F7 Worker Sync Unit Test Result: ' + pass + '/' + (pass + fail) + ' passed ===');
process.exit(fail ? 1 : 0);
