/**
 * Cloudflare Worker — server-side code verification + PDF proxy
 * 
 * Phase B: replaces client-side manifest check with JWTs
 * Phase C: secure PDF serving with JWT validation
 * 
 * KV namespace: ACCESS_CODES
 * Keys: code:<UPPERCASED_CODE> → { products, plan, durationDays, expiresAt, maxUses, uses }
 *       pdf:<filename>         → binary PDF data (base64)
 *       ratelimit:<IP>          → count (TTL 300s)
 *       log:<ts>:<uuid>         → { code, productId, success, ts } (TTL 30d)
 *       
 * PDF product IDs (for JWT productId matching):
 *   training_book  → requires JWT with productId='training_book' or plan='master'
 *   nutrition_book → requires JWT with productId='nutrition_book' or plan='master'
 *   (guides are free — served without JWT)
 */

import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

// Maps PDF KV key → required productId for JWT (null = free/no auth needed)
const PDF_PRODUCT_MAP = {
  'training-book': 'training_book',
  'nutrition-book': 'nutrition_book',
};

async function getSecret(env) {
  return encoder.encode(env.JWT_SECRET);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    // ---- PDF proxy ----
    if (url.pathname.startsWith('/api/pdf/') && request.method === 'GET') {
      return handlePdfProxy(request, env, url);
    }

    // ---- Auth endpoints ----
    if (url.pathname === '/api/verify-code' && request.method === 'POST') {
      return handleVerify(request, env);
    }
    if (url.pathname === '/api/check-token' && request.method === 'POST') {
      return handleCheckToken(request, env);
    }
    // ---- Admin endpoint ----
    if (url.pathname === '/api/issue-code' && request.method === 'POST') {
      return handleIssueCode(request, env);
    }
    return new Response('Not found', { status: 404, headers: corsHeaders(env, request) });
  }
};

async function handleVerify(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env);
  }
  const { code, productId } = body;
  if (!code || !productId) {
    return json({ valid: false, error: 'missing_fields' }, 400, env);
  }

  // Rate limit
  const rateLimited = await checkRateLimit(request, env);
  if (rateLimited) return json({ valid: false, error: 'rate_limited' }, 429, env);

  const normalized = code.trim().toUpperCase();
  const record = await env.ACCESS_CODES.get(`code:${normalized}`, 'json');

  if (!record) {
    await logAttempt(env, normalized, productId, false);
    return json({ valid: false, error: 'invalid_code' }, 401, env);
  }
  if (record.products !== 'all' && !record.products.includes(productId)) {
    await logAttempt(env, normalized, productId, false);
    return json({ valid: false, error: 'wrong_product' }, 403, env);
  }
  if (record.expiresAt && Date.now() > new Date(record.expiresAt).getTime()) {
    await logAttempt(env, normalized, productId, false);
    return json({ valid: false, error: 'code_expired' }, 401, env);
  }
  if (record.maxUses && record.uses >= record.maxUses) {
    await logAttempt(env, normalized, productId, false);
    return json({ valid: false, error: 'code_exhausted' }, 401, env);
  }

  // Increment usage
  record.uses = (record.uses || 0) + 1;
  await env.ACCESS_CODES.put(`code:${normalized}`, JSON.stringify(record));

  const durationMs = (record.durationDays || 30) * 86400000;
  const expiresAt = new Date(Date.now() + durationMs);

  const secret = await getSecret(env);
  const token = await new SignJWT({ productId, plan: record.plan, codePrefix: normalized.substring(0, 4) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);

  await logAttempt(env, normalized, productId, true);

  return json({
    valid: true,
    token,
    expiresAt: expiresAt.toISOString(),
    plan: record.plan,
    durationDays: record.durationDays || 30
  }, 200, env);
}

async function handleCheckToken(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env);
  }
  const { token, productId } = body;
  if (!token) {
    return json({ valid: false, error: 'missing_token' }, 400, env);
  }
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(token, secret);
    // A master-plan token or matching productId is valid
    if (payload.plan !== 'master' && payload.productId !== productId) {
      return json({ valid: false }, 403, env);
    }
    return json({ valid: true, plan: payload.plan, codePrefix: payload.codePrefix }, 200, env);
  } catch (e) {
    return json({ valid: false, error: 'invalid_token' }, 401, env);
  }
}

async function handleIssueCode(request, env) {
  // Authenticate with a shared admin secret
  const authHeader = request.headers.get('X-Admin-Key');
  if (!authHeader || authHeader !== env.ADMIN_KEY) {
    return json({ error: 'unauthorized' }, 401, env);
  }
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env);
  }
  const { code, products, plan, durationDays, expiresAt, maxUses } = body;
  if (!code) {
    return json({ error: 'missing_code' }, 400, env);
  }

  const normalized = code.trim().toUpperCase();
  const record = {
    products: products || 'all',
    plan: plan || 'single_product',
    durationDays: durationDays || 30,
    uses: 0
  };
  if (expiresAt) record.expiresAt = expiresAt;
  if (maxUses) record.maxUses = maxUses;

  await env.ACCESS_CODES.put(`code:${normalized}`, JSON.stringify(record));
  return json({ success: true, code: normalized }, 200, env);
}

async function handlePdfProxy(request, env, url) {
  // Extract filename: /api/pdf/training-book → training-book
  const filename = url.pathname.replace('/api/pdf/', '');
  const token = url.searchParams.get('token');
  const requiredProduct = PDF_PRODUCT_MAP[filename];

  // Free guides — serve directly (no JWT needed)
  if (!requiredProduct) {
    const data = await env.ACCESS_CODES.get(`pdf:${filename}`, 'arrayBuffer');
    if (!data) {
      return new Response('PDF not found', { status: 404, headers: corsHeaders(env, request, false) });
    }
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders(env, request, false)
      }
    });
  }

  // Paid book — require valid JWT
  if (!token) {
    return new Response('Unauthorized — missing token', { status: 401, headers: corsHeaders(env, request, false) });
  }
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(token, secret);
    if (payload.plan !== 'master' && payload.productId !== requiredProduct) {
      return new Response('Forbidden — no access to this product', { status: 403, headers: corsHeaders(env, request, false) });
    }
    // JWT valid and user has access — serve PDF
    const data = await env.ACCESS_CODES.get(`pdf:${filename}`, 'arrayBuffer');
    if (!data) {
      return new Response('PDF not found', { status: 404, headers: corsHeaders(env, request, false) });
    }
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-cache',
        ...corsHeaders(env, request, false)
      }
    });
  } catch (e) {
    return new Response('Unauthorized — invalid token', { status: 401, headers: corsHeaders(env, request, false) });
  }
}

async function checkRateLimit(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:${ip}`;
  const count = parseInt(await env.ACCESS_CODES.get(key) || '0');
  if (count >= 10) return true;
  await env.ACCESS_CODES.put(key, String(count + 1), { expirationTtl: 300 });
  return false;
}

async function logAttempt(env, code, productId, success) {
  const key = `log:${Date.now()}:${crypto.randomUUID()}`;
  await env.ACCESS_CODES.put(key, JSON.stringify({ code, productId, success, ts: Date.now() }),
    { expirationTtl: 2592000 });
}

function json(obj, status = 200, env) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) }
  });
}

function corsHeaders(env, request, isAuth = true) {
  let origin = '*';
  if (env && env.CORS_ORIGIN) {
    origin = env.CORS_ORIGIN;
  } else if (request) {
    const reqOrigin = request.headers.get('Origin');
    if (reqOrigin) origin = reqOrigin;
  }
  const methods = isAuth ? 'POST, OPTIONS' : 'GET, OPTIONS';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key'
  };
}
