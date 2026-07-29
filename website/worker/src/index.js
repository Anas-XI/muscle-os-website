/**
 * Cloudflare Worker — server-side code verification + PDF proxy + order management
 * 
 * Phase B: replaces client-side manifest check with JWTs
 * Phase C: secure PDF serving with JWT validation
 * Phase D: self-serve order + one-tap approval flow
 * 
 * KV namespace: ACCESS_CODES
 * Keys: code:<UPPERCASED_CODE> → { products, plan, durationDays, expiresAt, maxUses, uses }
 *       pdf:<filename>         → binary PDF data (base64)
 *       ratelimit:<IP>          → count (TTL 300s)
 *       log:<ts>:<uuid>         → { code, productId, success, ts } (TTL 30d)
 *       
 * KV namespace: PENDING_ORDERS
 * Keys: order:<uuid> → { id, product, customerName, whatsappNumber, email, paymentRef,
 *                        paymentMethod, lang, status, createdAt, resolvedAt, resolvedBy,
 *                        rejectionReason, issuedCode }
 *       
 * PDF product IDs (for JWT productId matching):
 *   training_book  → requires JWT with productId='training_book' or plan='master'
 *   nutrition_book → requires JWT with productId='nutrition_book' or plan='master'
 *   (guides are free — served without JWT)
 */

// ── Product configuration for auto code generation ──
const PRODUCT_CONFIG = {
  training_tool:        { prefix: 'TR', products: ['training_tool'], durationDays: 30, plan: 'single_product' },
  tdee_adaptive_engine: { prefix: 'TD', products: ['tdee_adaptive_engine'], durationDays: 30, plan: 'single_product' },
  both_tools:           { prefix: 'TB', products: ['training_tool', 'tdee_adaptive_engine'], durationDays: 30, plan: 'single_product' },
  training_book:        { prefix: 'BK', products: ['training_book'], durationDays: 0, plan: 'single_product' },
  nutrition_book:       { prefix: 'BN', products: ['nutrition_book'], durationDays: 0, plan: 'single_product' },
  both_books:           { prefix: 'BB', products: ['training_book', 'nutrition_book'], durationDays: 0, plan: 'single_product' },
  all_access:           { prefix: 'MA', products: 'all', durationDays: 30, plan: 'master' },
};
const VALID_PRODUCTS = Object.keys(PRODUCT_CONFIG);
const ORDER_TTL_SECONDS = 172800; // 48 hours

const PRODUCT_NAMES = {
  training_tool:        { en: 'Training Tool', ar: 'أداة التدريب' },
  tdee_adaptive_engine: { en: 'TDEE Adaptive Engine', ar: 'محرك TDEE التكيفي' },
  both_tools:           { en: 'Training Tools Bundle', ar: 'حزمة أدوات التدريب' },
  training_book:        { en: 'Training Book', ar: 'كتاب التدريب' },
  nutrition_book:       { en: 'Nutrition Book', ar: 'كتاب التغذية' },
  both_books:           { en: 'Books Bundle', ar: 'حزمة الكتب' },
  all_access:           { en: 'All Access', ar: 'الوصول الكامل' },
};

import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

const encoder = new TextEncoder();
const rateLimitWindows = new Map();
let googleJWKS = null;
function getGoogleJWKS() {
  if (!googleJWKS) {
    googleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  }
  return googleJWKS;
}

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
      const isPdf = url.pathname.startsWith('/api/pdf/');
      return new Response(null, { headers: corsHeaders(env, request, !isPdf) });
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
    // ---- Revoke endpoint ----
    if (url.pathname === '/api/revoke-code' && request.method === 'POST') {
      return handleRevokeCode(request, env);
    }
    // ---- Order management ----
    if (url.pathname === '/api/create-order' && request.method === 'POST') {
      return handleCreateOrder(request, env);
    }
    if (url.pathname === '/api/pending-orders' && request.method === 'POST') {
      return handlePendingOrders(request, env);
    }
    if (url.pathname === '/api/approve-order' && request.method === 'POST') {
      return handleApproveOrder(request, env);
    }
    if (url.pathname === '/api/reject-order' && request.method === 'POST') {
      return handleRejectOrder(request, env);
    }
    // ---- Google Auth ----
    if (url.pathname === '/api/auth/google' && request.method === 'POST') {
      return handleGoogleAuth(request, env);
    }
    if (url.pathname === '/api/check-session' && request.method === 'POST') {
      return handleCheckSession(request, env);
    }
    if (url.pathname === '/api/refresh-session' && request.method === 'POST') {
      return handleRefreshSession(request, env);
    }
    return json({ error: 'not_found' }, 404, env, request);
  }
};

async function handleVerify(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env, request);
  }
  const { code, productId } = body;
  if (!code || !productId) {
    return json({ valid: false, error: 'missing_fields' }, 400, env, request);
  }

  // Rate limit
  const rateLimited = await checkRateLimit(request, env);
  if (rateLimited) return json({ valid: false, error: 'rate_limited' }, 429, env, request);

  const normalized = code.trim().toUpperCase();

  // Atomic verification via Durable Object (eliminates TOCTOU race)
  const doId = env.CODE_COUNTER.idFromName(normalized);
  const stub = env.CODE_COUNTER.get(doId);
  const doResp = await stub.fetch('http://do/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });
  const doResult = await doResp.json();

  if (!doResult.valid) {
    // Lazy migration: if DO has no record, check KV for existing pre-DO codes
    if (doResult.error === 'invalid_code') {
      const kvRecord = await env.ACCESS_CODES.get(`code:${normalized}`, 'json');
      if (kvRecord) {
        await stub.fetch('http://do/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kvRecord)
        });
        // Retry verification once
        const retryResp = await stub.fetch('http://do/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
        const retryResult = await retryResp.json();
        if (retryResult.valid) {
          doResult.valid = true;
          doResult.plan = retryResult.plan;
          doResult.durationDays = retryResult.durationDays;
        } else {
          await logAttempt(env, normalized, productId, false);
          return json({ valid: false, error: retryResult.error }, retryResp.status, env, request);
        }
      } else {
        await logAttempt(env, normalized, productId, false);
        return json({ valid: false, error: 'invalid_code' }, 401, env, request);
      }
    } else {
      await logAttempt(env, normalized, productId, false);
      return json({ valid: false, error: doResult.error }, doResp.status, env, request);
    }
  }

  const durationDays = doResult.durationDays != null ? doResult.durationDays : 30;
  const expiresAt = durationDays > 0
    ? new Date(Date.now() + durationDays * 86400000)
    : new Date('2099-12-31'); // lifetime

  const secret = await getSecret(env);
  const token = await new SignJWT({ productId, plan: doResult.plan, codePrefix: normalized.substring(0, 4) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('muscleos-access-control')
    .setAudience('muscleos-website')
    .setSubject(normalized.substring(0, 4))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);

  await logAttempt(env, normalized, productId, true);

  return json({
    valid: true,
    token,
    expiresAt: expiresAt.toISOString(),
    plan: doResult.plan,
    durationDays: doResult.durationDays || 30
  }, 200, env, request);
}

async function handleCheckToken(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env, request);
  }
  const { token, productId } = body;
  if (!token) {
    return json({ valid: false, error: 'missing_token' }, 400, env, request);
  }
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'muscleos-access-control',
      audience: 'muscleos-website',
    });
    // A master-plan token or matching productId is valid
    if (payload.plan !== 'master' && payload.productId !== productId) {
      return json({ valid: false }, 403, env, request);
    }
    return json({ valid: true, plan: payload.plan, codePrefix: payload.codePrefix }, 200, env, request);
  } catch (e) {
    return json({ valid: false, error: 'invalid_token' }, 401, env, request);
  }
}

async function handleIssueCode(request, env) {
  // Rate limit admin endpoint separately
  const adminLimited = await checkRateLimit(request, env, 5);
  if (adminLimited) return json({ error: 'rate_limited' }, 429, env, request);

  // Authenticate with a shared admin secret
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }
  let body;
  try { body = await request.json();   } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { code, products, plan, durationDays, expiresAt, maxUses } = body;
  if (!code) {
    return json({ error: 'missing_code' }, 400, env, request);
  }
  const VALID_PLANS = ['single_product', 'master'];
  if (plan && !VALID_PLANS.includes(plan)) {
    return json({ error: 'invalid_plan' }, 400, env, request);
  }
  if (durationDays != null && (typeof durationDays !== 'number' || durationDays < 0)) {
    return json({ error: 'invalid_duration' }, 400, env, request);
  }
  if (maxUses != null && (typeof maxUses !== 'number' || maxUses < 1)) {
    return json({ error: 'invalid_max_uses' }, 400, env, request);
  }

  const normalized = code.trim().toUpperCase();
  const record = {
    products: products || 'all',
    plan: plan || 'single_product',
    durationDays: durationDays != null ? durationDays : 30,
    uses: 0
  };
  if (expiresAt) record.expiresAt = expiresAt;
  if (maxUses) record.maxUses = maxUses;

  await env.ACCESS_CODES.put(`code:${normalized}`, JSON.stringify(record));
  // Initialize Durable Object for atomic counting
  const doId = env.CODE_COUNTER.idFromName(normalized);
  const stub = env.CODE_COUNTER.get(doId);
  await stub.fetch('http://do/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
  await logAttempt(env, normalized, 'admin:issue', true);
  return json({ success: true, code: normalized }, 200, env, request);
}

/** Admin: revoke an existing code (sets uses=-1) */
async function handleRevokeCode(request, env) {
  const adminLimited = await checkRateLimit(request, env, 5);
  if (adminLimited) return json({ error: 'rate_limited' }, 429, env, request);
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { code } = body;
  if (!code) return json({ error: 'missing_code' }, 400, env, request);
  const normalized = code.trim().toUpperCase();
  const existing = await env.ACCESS_CODES.get(`code:${normalized}`, 'json');
  if (!existing) return json({ error: 'code_not_found' }, 404, env, request);
  existing.uses = -1;
  existing.revokedAt = Date.now();
  await env.ACCESS_CODES.put(`code:${normalized}`, JSON.stringify(existing));
  // Revoke via Durable Object
  const doId = env.CODE_COUNTER.idFromName(normalized);
  const stub = env.CODE_COUNTER.get(doId);
  await stub.fetch('http://do/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  await logAttempt(env, normalized, 'admin:revoke', true);
  return json({ success: true, code: normalized, revoked: true }, 200, env, request);
}

// ── Product helpers ──────────────────────────────────────────────

function generateOrderCode(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const array = new Uint8Array(10);
  crypto.getRandomValues(array);
  for (let i = 0; i < 10; i++) {
    result += chars[array[i] % chars.length];
  }
  return `${prefix}-${result}`;
}

async function issueCodeForProduct(product, env) {
  const cfg = PRODUCT_CONFIG[product];
  if (!cfg) throw new Error('invalid_product');
  const code = generateOrderCode(cfg.prefix);
  const record = {
    products: cfg.products,
    plan: cfg.plan || 'single_product',
    durationDays: cfg.durationDays != null ? cfg.durationDays : 30,
    uses: 0,
  };
  await env.ACCESS_CODES.put(`code:${code}`, JSON.stringify(record));
  const doId = env.CODE_COUNTER.idFromName(code);
  const stub = env.CODE_COUNTER.get(doId);
  await stub.fetch('http://do/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  return code;
}

function buildWaMessage(name, product, code, lang) {
  const pn = PRODUCT_NAMES[product];
  if (!pn) return `Your code is: ${code}`;
  if (lang === 'ar') {
    return `مرحباً ${name}! كود ${pn.ar} الخاص بك هو: ${code} — استمتع 💪`;
  }
  return `Hi ${name}! Your ${pn.en} code is: ${code} — Enjoy 💪`;
}

// ── POST /api/create-order (public, rate-limited) ────────────────

async function handleCreateOrder(request, env) {
  const rateLimited = await checkRateLimit(request, env, 5);
  if (rateLimited) return json({ error: 'rate_limited' }, 429, env, request);

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }

  const { product, customerName, whatsappNumber, email, paymentRef, paymentMethod, lang } = body;

  // Validate required fields
  if (!product || !VALID_PRODUCTS.includes(product)) {
    return json({ error: 'invalid_product' }, 400, env, request);
  }
  if (!customerName || customerName.trim().length < 1) {
    return json({ error: 'missing_customer_name' }, 400, env, request);
  }
  if (!whatsappNumber || !/^\+?\d{7,15}$/.test(whatsappNumber.replace(/[-\s()]/g, ''))) {
    return json({ error: 'invalid_whatsapp_number' }, 400, env, request);
  }
  if (!paymentRef || paymentRef.trim().length < 1) {
    return json({ error: 'missing_payment_ref' }, 400, env, request);
  }

  const validMethods = ['instapay', 'vodafone_cash', 'other'];
  if (paymentMethod && !validMethods.includes(paymentMethod)) {
    return json({ error: 'invalid_payment_method' }, 400, env, request);
  }

  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  const order = {
    id: orderId,
    product,
    customerName: customerName.trim(),
    whatsappNumber: whatsappNumber.trim(),
    email: email ? email.trim() : null,
    paymentRef: paymentRef.trim(),
    paymentMethod: paymentMethod || 'other',
    lang: lang === 'en' ? 'en' : 'ar',
    status: 'pending',
    createdAt: now,
    resolvedAt: null,
    resolvedBy: null,
    rejectionReason: null,
    issuedCode: null,
  };

  await env.PENDING_ORDERS.put(`order:${orderId}`, JSON.stringify(order), { expirationTtl: ORDER_TTL_SECONDS });
  return json({ status: 'ok', orderId }, 200, env, request);
}

// ── POST /api/pending-orders (admin-key protected) ───────────────

async function handlePendingOrders(request, env) {
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }

  const listResult = await env.PENDING_ORDERS.list({ prefix: 'order:' });
  const orders = [];
  for (const entry of listResult.keys) {
    const order = await env.PENDING_ORDERS.get(entry.name, 'json');
    if (order && order.status === 'pending') {
      orders.push(order);
    }
  }
  orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return json({ orders }, 200, env, request);
}

// ── POST /api/approve-order (admin-key protected) ────────────────

async function handleApproveOrder(request, env) {
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { orderId } = body;
  if (!orderId) {
    return json({ error: 'missing_order_id' }, 400, env, request);
  }

  const order = await env.PENDING_ORDERS.get(`order:${orderId}`, 'json');
  if (!order) {
    return json({ error: 'order_not_found' }, 404, env, request);
  }
  if (order.status !== 'pending') {
    return json({ error: 'order_not_pending', status: order.status }, 400, env, request);
  }

  // Generate and issue code
  const code = await issueCodeForProduct(order.product, env);

  // Update order
  order.status = 'approved';
  order.resolvedAt = new Date().toISOString();
  order.resolvedBy = 'admin';
  order.issuedCode = code;
  await env.PENDING_ORDERS.put(`order:${orderId}`, JSON.stringify(order), { expirationTtl: ORDER_TTL_SECONDS });

  const prefilledMessage = buildWaMessage(order.customerName, order.product, code, order.lang);
  return json({
    status: 'ok',
    code,
    whatsappNumber: order.whatsappNumber,
    prefilledMessage,
    lang: order.lang,
    customerName: order.customerName,
    product: order.product,
  }, 200, env, request);
}

// ── POST /api/reject-order (admin-key protected) ─────────────────

async function handleRejectOrder(request, env) {
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { orderId, reason } = body;
  if (!orderId) {
    return json({ error: 'missing_order_id' }, 400, env, request);
  }
  const validReasons = ['didnt_pay', 'suspicious', 'duplicate', 'other'];
  if (!reason || !validReasons.includes(reason)) {
    return json({ error: 'invalid_reason' }, 400, env, request);
  }

  const order = await env.PENDING_ORDERS.get(`order:${orderId}`, 'json');
  if (!order) {
    return json({ error: 'order_not_found' }, 404, env, request);
  }
  if (order.status !== 'pending') {
    return json({ error: 'order_not_pending', status: order.status }, 400, env, request);
  }

  order.status = 'rejected';
  order.resolvedAt = new Date().toISOString();
  order.resolvedBy = 'admin';
  order.rejectionReason = reason;
  await env.PENDING_ORDERS.put(`order:${orderId}`, JSON.stringify(order), { expirationTtl: ORDER_TTL_SECONDS });

  return json({ status: 'ok', orderId }, 200, env, request);
}

async function handleGoogleAuth(request, env) {
  if (!env.GOOGLE_CLIENT_ID) {
    return json({ valid: false, error: 'google_auth_not_configured' }, 501, env, request);
  }
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env, request);
  }
  const { token } = body;
  if (!token) return json({ valid: false, error: 'missing_token' }, 400, env, request);
  try {
    const { payload } = await jwtVerify(token, getGoogleJWKS(), {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: env.GOOGLE_CLIENT_ID,
    });
    const email = payload.email;
    if (!email) return json({ valid: false, error: 'no_email_in_token' }, 400, env, request);
    const secret = await getSecret(env);
    const sessionToken = await new SignJWT({
      type: 'session', email, name: payload.name || '', googleSub: payload.sub,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('muscleos-access-control')
      .setAudience('muscleos-website')
      .setSubject(email)
      .setExpirationTime(Math.floor(Date.now() / 1000) + 604800)
      .sign(secret);
    return json({ valid: true, session: sessionToken, email, name: payload.name || '' }, 200, env, request);
  } catch (e) {
    return json({ valid: false, error: 'invalid_google_token' }, 401, env, request);
  }
}

async function handleCheckSession(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env, request);
  }
  const { session } = body;
  if (!session) return json({ valid: false, error: 'missing_session' }, 400, env, request);
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(session, secret, {
      audience: 'muscleos-website',
      issuer: 'muscleos-access-control',
    });
    if (payload.type !== 'session') return json({ valid: false }, 403, env, request);
    return json({ valid: true, email: payload.email, name: payload.name }, 200, env, request);
  } catch (e) {
    return json({ valid: false, error: 'invalid_session' }, 401, env, request);
  }
}

async function handleRefreshSession(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env, request);
  }
  const { session } = body;
  if (!session) return json({ valid: false, error: 'missing_session' }, 400, env, request);
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(session, secret, {
      audience: 'muscleos-website',
      issuer: 'muscleos-access-control',
    });
    if (payload.type !== 'session') return json({ valid: false }, 403, env, request);
    // Issue fresh session token with new 7-day expiry
    const newToken = await new SignJWT({
      type: 'session', email: payload.email, name: payload.name || '', googleSub: payload.googleSub,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('muscleos-access-control')
      .setAudience('muscleos-website')
      .setSubject(payload.email)
      .setExpirationTime(Math.floor(Date.now() / 1000) + 604800)
      .sign(secret);
    return json({ valid: true, session: newToken, email: payload.email, name: payload.name || '' }, 200, env, request);
  } catch (e) {
    return json({ valid: false, error: 'invalid_session' }, 401, env, request);
  }
}

async function handlePdfProxy(request, env, url) {
  // Extract filename: /api/pdf/training-book → training-book
  const filename = url.pathname.replace('/api/pdf/', '');
  // H-1: Validate filename — only allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(filename)) {
    return new Response('Invalid filename', { status: 400, headers: corsHeaders(env, request, false) });
  }
  // C-2: Read JWT from Authorization header, not URL
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
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

  // Rate limit PDF downloads
  const pdfLimited = await checkRateLimit(request, env, 50);
  if (pdfLimited) return new Response('Too many requests', { status: 429, headers: corsHeaders(env, request, false) });

  // Paid book — require valid JWT
  if (!token) {
    return new Response('Unauthorized — missing token', { status: 401, headers: corsHeaders(env, request, false) });
  }
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'muscleos-access-control',
      audience: 'muscleos-website',
    });
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

// In-memory sliding-window rate limiter (no TOCTOU race, per-isolate)
async function checkRateLimit(request, env, maxRequests = 10) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const windowMs = 300000;
  let timestamps = rateLimitWindows.get(ip);
  if (!timestamps) {
    timestamps = [];
    rateLimitWindows.set(ip, timestamps);
  }
  const cutoff = now - windowMs;
  while (timestamps.length > 0 && timestamps[0] < cutoff) timestamps.shift();
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  return false;
}

async function logAttempt(env, code, productId, success) {
  const key = `log:${Date.now()}:${crypto.randomUUID()}`;
  await env.ACCESS_CODES.put(key, JSON.stringify({ code, productId, success, ts: Date.now() }),
    { expirationTtl: 2592000 });
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function json(obj, status = 200, env, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) }
  });
}

/**
 * Durable Object — per-code atomic counter
 * Eliminates TOCTOU race on code usage increments
 */
export class CodeCounter {
  constructor(state, env) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/verify') {
      return this.handleVerify(request);
    }
    if (request.method === 'POST' && url.pathname === '/initialize') {
      return this.handleInitialize(request);
    }
    if (request.method === 'POST' && url.pathname === '/revoke') {
      return this.handleRevoke();
    }
    return new Response('Not found', { status: 404 });
  }
  async handleVerify(request) {
    let productId;
    try { const b = await request.json(); productId = b.productId; } catch (e) {
      return new Response(JSON.stringify({ valid: false, error: 'invalid_json' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const record = await this.state.storage.get('record');
    if (!record) {
      return new Response(JSON.stringify({ valid: false, error: 'invalid_code' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (record.uses === -1) {
      return new Response(JSON.stringify({ valid: false, error: 'code_revoked' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (record.products !== 'all' && !record.products.includes(productId)) {
      return new Response(JSON.stringify({ valid: false, error: 'wrong_product' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    if (record.expiresAt && Date.now() > new Date(record.expiresAt).getTime()) {
      return new Response(JSON.stringify({ valid: false, error: 'code_expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (record.maxUses && (record.uses || 0) >= record.maxUses) {
      return new Response(JSON.stringify({ valid: false, error: 'code_exhausted' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    record.uses = (record.uses || 0) + 1;
    await this.state.storage.put('record', record);
    return new Response(JSON.stringify({ valid: true, uses: record.uses, plan: record.plan, durationDays: record.durationDays }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  async handleInitialize(request) {
    let record;
    try { record = await request.json(); } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await this.state.storage.put('record', record);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  async handleRevoke() {
    const record = await this.state.storage.get('record') || { uses: 0 };
    record.uses = -1;
    record.revokedAt = Date.now();
    await this.state.storage.put('record', record);
    return new Response(JSON.stringify({ success: true, revoked: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

function corsHeaders(env, request, isAuth = true) {
  const ALLOWED_ORIGINS = ['https://anas-xi.github.io', 'https://muscleos.is-a.dev'];
  let origin = env && env.CORS_ORIGIN ? env.CORS_ORIGIN : '';
  if (!origin && request) {
    const reqOrigin = request.headers.get('Origin');
    if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) {
      origin = reqOrigin;
    }
  }
  const methods = isAuth ? 'POST, OPTIONS' : 'GET, OPTIONS';
  const headers = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer-when-downgrade',
    'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; script-src 'unsafe-inline' 'self' https://apis.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://muscleos-access-control.muscleos.workers.dev https://anas-xi.github.io; frame-src https://accounts.google.com; img-src 'self' data:;",
    'Vary': 'Origin'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
