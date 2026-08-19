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
  omni_hub:             { prefix: 'OH', products: ['omni_hub'], durationDays: 30, plan: 'single_product' },
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
  omni_hub:             { en: 'OMNI HUB', ar: 'أومني هب' },
  training_book:        { en: 'Training Book', ar: 'كتاب التدريب' },
  nutrition_book:       { en: 'Nutrition Book', ar: 'كتاب التغذية' },
  both_books:           { en: 'Books Bundle', ar: 'حزمة الكتب' },
  all_access:           { en: 'All Access', ar: 'الوصول الكامل' },
};

// ── Payment provider configuration ──
const PRODUCT_PRICES = {
  training_tool:        { amountCents: 30000 },
  tdee_adaptive_engine: { amountCents: 20000 },
  both_tools:           { amountCents: 40000 },
  omni_hub:             { amountCents: 40000 },
  training_book:        { amountCents: 50000 },
  nutrition_book:       { amountCents: 50000 },
  both_books:           { amountCents: 80000 },
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
  const s = env.JWT_SECRET || '';
  if (s.length < 32) throw new Error('JWT_SECRET not configured');
  return encoder.encode(s);
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
    // ---- Fallback usage logging (rate-limited, no admin key needed) ----
    if (url.pathname === '/api/log-fallback-usage' && request.method === 'POST') {
      return handleLogFallbackUsage(request, env);
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
    // ---- Payment endpoints ----
    if (url.pathname === '/api/create-payment-link' && request.method === 'POST') {
      return handleCreatePaymentLink(request, env);
    }
    if (url.pathname === '/api/paymob-callback' && request.method === 'POST') {
      return handlePaymobCallback(request, env);
    }
    if (url.pathname === '/api/check-order-status' && request.method === 'POST') {
      return handleCheckOrderStatus(request, env);
    }
    // ---- Data sync (training tool) ----
    if (url.pathname === '/api/sync/save' || url.pathname === '/api/sync/load') {
      return json({ error: 'endpoint_removed' }, 410, env, request);
    }
    // ---- Data sync v2 (passphrase-guarded, key in path) ----
    if (url.pathname.startsWith('/api/sync/') && request.method === 'POST') {
      return handleSyncPush(request, env, url);
    }
    if (url.pathname.startsWith('/api/sync/') && request.method === 'GET') {
      return handleSyncPull(request, env, url);
    }
    // ---- Expiry reminders (admin) ----
    if (url.pathname === '/api/expiring-codes' && request.method === 'POST') {
      return handleExpiringCodes(request, env);
    }
    // ---- WhatsApp coach notification ----
    if (url.pathname === '/api/notify-coach' && request.method === 'POST') {
      return handleNotifyCoach(request, env);
    }
    // ---- AI Coach ----
    if (url.pathname === '/api/ai-coach' && request.method === 'POST') {
      return handleAiCoach(request, env);
    }

    // ---- Phase 5: Supabase Sync ----
    if (url.pathname === '/api/profile/save' && request.method === 'POST') {
      return handleProfileSave(request, env);
    }
    if (url.pathname === '/api/profile/load' && request.method === 'GET') {
      return handleProfileLoad(request, env);
    }
    if (url.pathname === '/api/sessions/save' && request.method === 'POST') {
      return handleSessionSave(request, env);
    }
    if (url.pathname.startsWith('/api/sessions/load') && request.method === 'GET') {
      return handleSessionLoad(request, env, url);
    }
    if (url.pathname === '/api/deload/save' && request.method === 'POST') {
      return handleDeloadSave(request, env);
    }
    if (url.pathname === '/api/deload/load' && request.method === 'GET') {
      return handleDeloadLoad(request, env);
    }
    if (url.pathname === '/api/bodyweight/save' && request.method === 'POST') {
      return handleBodyweightSave(request, env);
    }
    if (url.pathname === '/api/link-telegram' && request.method === 'POST') {
      return handleLinkTelegram(request, env);
    }
    return json({ error: 'not_found' }, 404, env, request);
  }
};

async function handleVerify(request, env) {
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ valid: false, error: 'invalid_json' }, 400, env, request);
  }
  const { code, productId, session } = body;
  if (!code || !productId) {
    return json({ valid: false, error: 'missing_fields' }, 400, env, request);
  }

  // Rate limit
  const rateLimited = await checkRateLimit(request, env);
  if (rateLimited) return json({ valid: false, error: 'rate_limited' }, 429, env, request);

  const normalized = code.trim().toUpperCase();

  // Optional Google session — enables one-account binding when present
  let email = null;
  if (session) {
    try {
      const secret = await getSecret(env);
      const { payload } = await jwtVerify(session, secret, {
        audience: 'muscleos-website',
        issuer: 'muscleos-access-control',
      });
      if (payload.type !== 'session' || !payload.email) {
        return json({ valid: false, error: 'invalid_session' }, 401, env, request);
      }
      email = payload.email;
    } catch (e) {
      return json({ valid: false, error: 'invalid_session' }, 401, env, request);
    }
  }

  // One-account / one-time binding
  let binding = null;
  if (email) {
    binding = await env.ACCESS_CODES.get(`code:${normalized}:binding`, 'json');
    if (binding && binding.email && binding.email.toLowerCase() !== email.toLowerCase()) {
      await logAttempt(env, normalized, productId, false);
      return json({ valid: false, error: 'code_used_by_other' }, 403, env, request);
    }
    // Same account re-activating: idempotent grant from the stored expiry, no re-consumption
    if (binding && binding.email && binding.email.toLowerCase() === email.toLowerCase()) {
      const doId = env.CODE_COUNTER.idFromName(normalized);
      const stub = env.CODE_COUNTER.get(doId);
      let record = null;
      try {
        const inspResp = await stub.fetch('http://do/inspect', { method: 'POST' });
        const insp = await inspResp.json();
        record = insp.record || null;
        if (!record) {
          const kvRecord = await env.ACCESS_CODES.get(`code:${normalized}`, 'json');
          if (kvRecord) {
            await stub.fetch('http://do/initialize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(kvRecord)
            });
            const inspResp2 = await stub.fetch('http://do/inspect', { method: 'POST' });
            const insp2 = await inspResp2.json();
            record = insp2.record || null;
          }
        }
      } catch (e) { record = null; }
      if (!record) {
        await logAttempt(env, normalized, productId, false);
        return json({ valid: false, error: 'invalid_code' }, 401, env, request);
      }
      if (record.uses === -1) {
        await logAttempt(env, normalized, productId, false);
        return json({ valid: false, error: 'code_revoked' }, 401, env, request);
      }
      if (!productAllowed(record.products, productId)) {
        await logAttempt(env, normalized, productId, false);
        return json({ valid: false, error: 'wrong_product' }, 403, env, request);
      }
      const expiresAt = binding.expiresAt ? new Date(binding.expiresAt) : new Date(Date.now() + (record.durationDays || 30) * 86400000);
      if (expiresAt.getTime() < Date.now()) {
        await logAttempt(env, normalized, productId, false);
        return json({ valid: false, error: 'code_expired' }, 401, env, request);
      }
      await addAccountSub(env, email, { code: normalized, plan: record.plan, products: record.products, expiresAt: expiresAt.toISOString() });
      const secret = await getSecret(env);
      const effProductId = (record.products === 'all') ? 'all_access' : (Array.isArray(record.products) && record.products.length) ? record.products[0] : productId;
      const token = await new SignJWT({ productId: effProductId, plan: record.plan, codePrefix: normalized.substring(0, 4) })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('muscleos-access-control')
        .setAudience('muscleos-website')
        .setSubject(normalized.substring(0, 4))
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .sign(secret);
      await logAttempt(env, normalized, productId, true);
      const now = Date.now();
      const expTime = expiresAt.getTime();
      return json({
        valid: true,
        productId: effProductId,
        token,
        expiresAt: expiresAt.toISOString(),
        daysRemaining: expTime > now ? Math.ceil((expTime - now) / 86400000) : 0,
        plan: record.plan,
        durationDays: record.durationDays != null ? record.durationDays : 30,
        boundEmail: binding.email
      }, 200, env, request);
    }
  }

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
          doResult.products = retryResult.products || kvRecord.products;
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
  const effProductId = (doResult.products === 'all') ? 'all_access' : (Array.isArray(doResult.products) && doResult.products.length) ? doResult.products[0] : productId;
  const token = await new SignJWT({ productId: effProductId, plan: doResult.plan, codePrefix: normalized.substring(0, 4) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('muscleos-access-control')
    .setAudience('muscleos-website')
    .setSubject(normalized.substring(0, 4))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);

  await logAttempt(env, normalized, productId, true);

  // Bind this code to the Google account on first successful activation
  if (email) {
    await env.ACCESS_CODES.put(`code:${normalized}:binding`, JSON.stringify({
      email, expiresAt: expiresAt.toISOString(), plan: doResult.plan, ts: Date.now()
    }), { expirationTtl: 7776000 });
    await addAccountSub(env, email, { code: normalized, plan: doResult.plan, products: doResult.products, expiresAt: expiresAt.toISOString() });
  }

  const now = Date.now();
  const expTime = expiresAt.getTime();
  const daysRemaining = expTime > now ? Math.ceil((expTime - now) / 86400000) : 0;

  return json({
    valid: true,
    productId: effProductId,
    token,
    expiresAt: expiresAt.toISOString(),
    daysRemaining,
    plan: doResult.plan,
    durationDays: doResult.durationDays != null ? doResult.durationDays : 30
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
      // omni_hub code includes training_tool and tdee_adaptive_engine
      if (!(payload.productId === 'omni_hub' && (productId === 'training_tool' || productId === 'tdee_adaptive_engine'))) {
        return json({ valid: false }, 403, env, request);
      }
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
  if (key.length < 16) return json({ error: 'server_not_configured' }, 503, env, request);
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
  if (key.length < 16) return json({ error: 'server_not_configured' }, 503, env, request);
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

// ── POST /api/log-fallback-usage (rate-limited, no admin key) ────

async function handleLogFallbackUsage(request, env) {
  const limited = await checkRateLimit(request, env, 20);
  if (limited) return json({ error: 'rate_limited' }, 429, env, request);
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { entries } = body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return json({ error: 'no_entries' }, 400, env, request);
  }
  for (const entry of entries) {
    const key = `fallback:${Date.now()}:${crypto.randomUUID()}`;
    await env.ACCESS_CODES.put(key, JSON.stringify(entry), { expirationTtl: 2592000 });
  }
  return json({ status: 'ok', logged: entries.length }, 200, env, request);
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

// ── Shared approval logic (used by admin approve + auto-callback) ──
async function approveOrderLogic(orderId, order, env, source = 'auto') {
  if (order.status !== 'pending') {
    return { status: 'error', error: 'order_not_pending', currentStatus: order.status };
  }
  const code = await issueCodeForProduct(order.product, env);
  order.status = 'approved';
  order.resolvedAt = new Date().toISOString();
  order.resolvedBy = source === 'admin' ? 'admin' : 'paymob';
  order.issuedCode = code;
  order.generatedCode = code;
  await env.PENDING_ORDERS.put(`order:${orderId}`, JSON.stringify(order), { expirationTtl: ORDER_TTL_SECONDS });
  // Store customer contact alongside the code for expiry reminders
  const cfg = PRODUCT_CONFIG[order.product];
  const expiresAt = cfg && cfg.durationDays > 0
    ? new Date(Date.now() + cfg.durationDays * 86400000).toISOString()
    : null;
  const metaKey = `code:meta:${code}`;
  const codeMeta = {
    customerName: order.customerName,
    whatsappNumber: order.whatsappNumber,
    email: order.email,
    product: order.product,
    lang: order.lang || 'ar',
    issuedAt: new Date().toISOString(),
    expiresAt,
    durationDays: cfg ? cfg.durationDays : 30,
  };
  await env.ACCESS_CODES.put(metaKey, JSON.stringify(codeMeta), { expirationTtl: 7776000 });
  const prefilledMessage = buildWaMessage(order.customerName, order.product, code, order.lang);
  return {
    status: 'ok', code, whatsappNumber: order.whatsappNumber,
    prefilledMessage, lang: order.lang, customerName: order.customerName, product: order.product,
  };
}

// ── Paymob payment provider helpers ──

async function paymobAuthToken(apiKey) {
  const res = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Paymob auth failed (${res.status}): ${t}`); }
  const data = await res.json();
  if (!data.token) throw new Error(`Paymob auth no token: ${JSON.stringify(data)}`);
  return data.token;
}

async function paymobCreateOrder(token, amountCents, merchantOrderId) {
  const res = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_token: token, amount_cents: amountCents, currency: 'EGP', merchant_order_id: merchantOrderId, items: [] }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Paymob order failed (${res.status}): ${t}`); }
  return res.json();
}

async function paymobPaymentKey(token, amountCents, paymobOrderId, integrationId, billingData) {
  const res = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_token: token, amount_cents: amountCents, currency: 'EGP', order_id: paymobOrderId, integration_id: parseInt(integrationId), billing_data: billingData, lock_order_when_paid: true }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Paymob payment key failed (${res.status}): ${t}`); }
  return res.json();
}

async function verifyPaymobHmac(obj, hmacSecret) {
  const fields = ['amount_cents','created_at','currency','error_occured','has_insurance','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order','owner','pending','source_data_pan','source_data_sub_type','source_data_type','success','txn_response_code'];
  const concatStr = fields.map(f => {
    let v = obj[f];
    if (v === null || v === undefined) return '';
    if (f === 'order' && typeof v === 'object') v = v.id || '';
    return String(v);
  }).join('');
  const provided = obj.hmac;
  if (!provided) return false;
  const keyData = encoder.encode(hmacSecret);
  const data = encoder.encode(concatStr);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === provided.toLowerCase();
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
  if (key.length < 16) return json({ error: 'server_not_configured' }, 503, env, request);
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
  if (key.length < 16) return json({ error: 'server_not_configured' }, 503, env, request);
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { orderId } = body;
  if (!orderId) return json({ error: 'missing_order_id' }, 400, env, request);
  const order = await env.PENDING_ORDERS.get(`order:${orderId}`, 'json');
  if (!order) return json({ error: 'order_not_found' }, 404, env, request);
  const result = await approveOrderLogic(orderId, order, env, 'admin');
  if (result.status === 'error') return json(result, 400, env, request);
  return json(result, 200, env, request);
}

// ── POST /api/reject-order (admin-key protected) ─────────────────

async function handleRejectOrder(request, env) {
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (key.length < 16) return json({ error: 'server_not_configured' }, 503, env, request);
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

// ── POST /api/paymob-callback (Paymob webhook, HMAC-verified) ─────

async function handlePaymobCallback(request, env) {
  if (!env.PAYMOB_HMAC_SECRET || env.PAYMOB_HMAC_SECRET.length < 16) {
    return json({ status: 'ignored', reason: 'not_configured' }, 503, env, request);
  }
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ status: 'ignored', reason: 'invalid_json' }, 200, env, request);
  }
  const obj = body.obj || body;
  if (!(await verifyPaymobHmac(obj, env.PAYMOB_HMAC_SECRET || ''))) {
    return json({ status: 'ignored', reason: 'invalid_hmac' }, 200, env, request);
  }
  if (obj.success !== true || obj.pending === true || obj.is_voided === true || obj.is_refunded === true) {
    return json({ status: 'ignored', reason: 'not_successful' }, 200, env, request);
  }
  const ourOrderId = obj.merchant_order_id;
  if (!ourOrderId) return json({ status: 'ignored', reason: 'no_merchant_order_id' }, 200, env, request);
  const order = await env.PENDING_ORDERS.get(`order:${ourOrderId}`, 'json');
  if (!order) return json({ status: 'ignored', reason: 'order_not_found' }, 200, env, request);
  if (order.status !== 'pending') {
    return json({ status: 'already_resolved', currentStatus: order.status }, 200, env, request);
  }
  const result = await approveOrderLogic(ourOrderId, order, env, 'paymob');
  if (result.status === 'error') return json(result, 500, env, request);
  return json({ status: 'approved', code: result.code }, 200, env, request);
}

// ── POST /api/create-payment-link (creates Paymob payment URL) ────

async function handleCreatePaymentLink(request, env) {
  const rateLimited = await checkRateLimit(request, env, 5);
  if (rateLimited) return json({ error: 'rate_limited' }, 429, env, request);

  if (!env.PAYMOB_API_KEY || !env.PAYMOB_INTEGRATION_ID || !env.PAYMOB_IFRAME_ID) {
    return json({ error: 'payment_provider_not_configured' }, 503, env, request);
  }

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { orderId } = body;
  if (!orderId) return json({ error: 'missing_order_id' }, 400, env, request);
  const order = await env.PENDING_ORDERS.get(`order:${orderId}`, 'json');
  if (!order) return json({ error: 'order_not_found' }, 404, env, request);
  if (order.status !== 'pending') {
    return json({ error: 'order_already_resolved', status: order.status }, 400, env, request);
  }
  const price = PRODUCT_PRICES[order.product];
  if (!price) return json({ error: 'product_not_available_for_online_payment' }, 400, env, request);
  try {
    const token = await paymobAuthToken(env.PAYMOB_API_KEY);
    const pmOrder = await paymobCreateOrder(token, price.amountCents, orderId);
    const billingData = {
      apartment: 'N/A', email: order.email || 'noemail@example.com',
      floor: 'N/A', first_name: (order.customerName || '').split(' ')[0] || 'Customer',
      street: 'N/A', building: 'N/A', phone_number: order.whatsappNumber || '+200000000000',
      shipping_method: 'PKG', postal_code: 'N/A', city: 'N/A',
      country: 'EG', last_name: (order.customerName || '').split(' ').slice(1).join(' ') || '.', state: 'N/A',
    };
    const pk = await paymobPaymentKey(token, price.amountCents, pmOrder.id, env.PAYMOB_INTEGRATION_ID, billingData);
    order.paymobOrderId = pmOrder.id;
    order.paymobPaymentToken = pk.token;
    await env.PENDING_ORDERS.put(`order:${orderId}`, JSON.stringify(order), { expirationTtl: ORDER_TTL_SECONDS });
    return json({
      paymentToken: pk.token,
      paymentUrl: `https://accept.paymob.com/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${pk.token}`,
    }, 200, env, request);
  } catch (err) {
    return json({ error: err.message }, 502, env, request);
  }
}

// ── POST /api/check-order-status (public — returns status + code if approved) ──

function maskAccessCode(code) {
  const s = String(code || '');
  return s.length > 7 ? s.slice(0, 7) + '***' : '***';
}


async function handleCheckOrderStatus(request, env) {
  const rateLimited = await checkRateLimit(request, env, 20);
  if (rateLimited) return json({ error: 'rate_limited' }, 429, env, request);

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }

  const { orderId, session } = body;
  if (!orderId) return json({ error: 'missing_order_id' }, 400, env, request);

  const order = await env.PENDING_ORDERS.get(`order:${orderId}`, 'json');
  if (!order) return json({ error: 'order_not_found' }, 404, env, request);

  let sessionEmail = null;
  if (session) {
    try {
      const secret = await getSecret(env);
      const { payload } = await jwtVerify(session, secret, {
        audience: 'muscleos-website',
        issuer: 'muscleos-access-control',
      });
      if (payload.type === 'session' && payload.email) sessionEmail = payload.email;
    } catch (e) {}
  }

  const match = !!sessionEmail && !!order.email && sessionEmail.toLowerCase() === order.email.toLowerCase();
  const code = order.issuedCode || order.generatedCode || null;
  const out = {
    status: order.status,
    code: match ? code : maskAccessCode(code),
    product: order.product,
  };
  if (match) out.customerName = order.customerName;
  return json(out, 200, env, request);
}


// ── POST /api/expiring-codes (admin-key protected) ────────────────
async function handleExpiringCodes(request, env) {
  const authHeader = request.headers.get('X-Admin-Key');
  const key = env.ADMIN_KEY || '';
  if (key.length < 16) return json({ error: 'server_not_configured' }, 503, env, request);
  if (!authHeader || !timingSafeEqual(authHeader, key)) {
    return json({ error: 'unauthorized' }, 401, env, request);
  }
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const { days } = body;
  const withinDays = (typeof days === 'number' && days > 0) ? days : 7;
  const now = Date.now();
  const expiryThreshold = now + withinDays * 86400000;

  // List all code:meta: keys to find expiring codes
  const listResult = await env.ACCESS_CODES.list({ prefix: 'code:meta:' });
  const expiring = [];

  for (const entry of listResult.keys) {
    const meta = await env.ACCESS_CODES.get(entry.name, 'json');
    if (!meta || !meta.expiresAt) continue;
    const expTime = new Date(meta.expiresAt).getTime();
    if (expTime > now && expTime <= expiryThreshold) {
      const code = entry.name.replace('code:meta:', '');
      const daysRemaining = Math.ceil((expTime - now) / 86400000);
      const waLink = meta.whatsappNumber
        ? `https://wa.me/${meta.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
            meta.lang === 'ar'
              ? `مرحباً ${meta.customerName}! باقي ${daysRemaining} أيام على انتهاء اشتراكك. جدد الآن 💪`
              : `Hi ${meta.customerName}! Your subscription expires in ${daysRemaining} days. Renew now 💪`
          )}`
        : null;
      expiring.push({
        code,
        customerName: meta.customerName,
        whatsappNumber: meta.whatsappNumber,
        email: meta.email,
        product: meta.product,
        lang: meta.lang,
        expiresAt: meta.expiresAt,
        daysRemaining,
        whatsappLink: waLink,
      });
    }
  }

  expiring.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return json({ expiring, count: expiring.length, checkedWithin: withinDays }, 200, env, request);
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
    return json({ valid: true, session: sessionToken, email, name: payload.name || '', subscriptions: await getAccountSubs(env, email) }, 200, env, request);
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
    return json({ valid: true, email: payload.email, name: payload.name, subscriptions: await getAccountSubs(env, payload.email) }, 200, env, request);
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
// ── Data sync (training tool) ──



async function sha256Hex(s) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s || ''));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function syncKeyFromPath(url) {
  return url.pathname.replace('/api/sync/', '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
}

// ── POST /api/sync/:key (passphrase-guarded push) ──
async function handleSyncPush(request, env, url) {
  const rateLimited = await checkRateLimit(request, env, 30);
  if (rateLimited) return json({ error: 'rate_limited' }, 429, env, request);
  const key = syncKeyFromPath(url);
  if (key.length < 4 || key.length > 64) return json({ error: 'invalid_key' }, 400, env, request);
  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }
  const data = body.data;

  const pw = request.headers.get('X-Sync-Passphrase') || body.pw || '';
  if (!data) return json({ error: 'missing_data' }, 400, env, request);
  const payloadSize = new TextEncoder().encode(JSON.stringify(data)).length;
  if (payloadSize > 1_000_000) return json({ error: 'data_too_large' }, 413, env, request);
  const meta = await env.ACCESS_CODES.get(`sync:${key}:meta`, 'json');
  const pwHash = pw ? await sha256Hex(pw) : null;
  if (meta && meta.pwHash) {
    if (!pwHash || !timingSafeEqual(pwHash, meta.pwHash)) {
      return json({ error: 'bad_passphrase' }, 401, env, request);
    }
  }
  await env.ACCESS_CODES.put(`sync:${key}:data`, JSON.stringify(data), { expirationTtl: 7776000 });
  await env.ACCESS_CODES.put(`sync:${key}:meta`, JSON.stringify({ pwHash, ts: Date.now() }), { expirationTtl: 7776000 });
  return json({ status: 'ok', ts: Date.now() }, 200, env, request);
}

// ── GET /api/sync/:key?pw= (passphrase-guarded pull) ──
async function handleSyncPull(request, env, url) {
  const rateLimited = await checkRateLimit(request, env, 60);
  if (rateLimited) return json({ error: 'rate_limited' }, 429, env, request);
  const key = syncKeyFromPath(url);
  if (key.length < 4 || key.length > 64) return json({ error: 'invalid_key' }, 400, env, request);
  const pw = request.headers.get('X-Sync-Passphrase') || '';
  const meta = await env.ACCESS_CODES.get(`sync:${key}:meta`, 'json');
  if (meta && meta.pwHash) {
    const pwHash = pw ? await sha256Hex(pw) : null;
    if (!pwHash || !timingSafeEqual(pwHash, meta.pwHash)) {
      return json({ error: 'bad_passphrase' }, 401, env, request);
    }
  }
  const raw = await env.ACCESS_CODES.get(`sync:${key}:data`);
  if (!raw) return json({ data: null, ts: meta ? meta.ts : null }, 200, env, request);
  try {
    return json({ data: JSON.parse(raw), ts: meta ? meta.ts : null }, 200, env, request);
  } catch (e) {
    return json({ error: 'corrupt_data' }, 500, env, request);
  }
}

// ── POST /api/notify-coach (sends WhatsApp to coach via Meta Cloud API) ──
async function handleAiCoach(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env, request) });
  
  try {
    if (!env.LLM_API_KEY) {
      return json({ error: 'LLM_API_KEY not configured in worker environment' }, 500, env, request);
    }
    
    const body = await request.json();
    const messages = [];
    
    if (body.systemInstruction) {
      messages.push({ role: 'system', content: body.systemInstruction });
    }
    
    if (body.contents) {
      body.contents.forEach(msg => {
        messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text });
      });
    }

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      stream: true,
      temperature: 0.7
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Bearer       },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return json({ error: 'Upstream API error', details: errText }, response.status, env, request);
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders(env, request)
      }
    });

  } catch (err) {
    return json({ error: 'Internal error', msg: err.message }, 500, env, request);
  }
}

async function handleNotifyCoach(request, env) {
  const rateLimited = await checkRateLimit(request, env, 10);
  if (rateLimited) return json({ error: 'rate_limited' }, 429, env, request);

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ error: 'invalid_json' }, 400, env, request);
  }

  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const coachNumber = env.COACH_WHATSAPP || '201040796017';

  const { type, data, session, token } = body;

  let authed = false;
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(session || '', secret, {
      audience: 'muscleos-website',
      issuer: 'muscleos-access-control',
    });
    if (payload.type === 'session') authed = true;
  } catch (e) {}
  if (!authed && token) {
    try {
      const secret = await getSecret(env);
      const { payload } = await jwtVerify(token, secret, {
        audience: 'muscleos-website',
        issuer: 'muscleos-access-control',
      });
      if (payload.productId) authed = true;
    } catch (e) {}
  }
  if (!authed) return json({ error: 'unauthorized' }, 401, env, request);

  if (!phoneNumberId || !accessToken) {
    return json({ error: 'whatsapp_not_configured' }, 503, env, request);
  }

  let messageBody;

  switch (type) {
    case 'onboarding':
      messageBody = `🆕 Onboarding Complete\n━━━━━━━━━━━━━━━\nName: ${data.name || '—'}\nAge: ${data.age || '—'}\nGoal: ${data.goal || '—'}\nDays/Week: ${data.days || '—'}\nTime: ${new Date().toLocaleString('en-EG')}`;
      break;
    case 'subscription':
      messageBody = `✅ Subscription Activated\n━━━━━━━━━━━━━━━\nName: ${data.name || '—'}\nCode: ${data.code || '—'}\nPlan: ${data.plan || 'pro_training'}\nExpires: ${data.expiry || '—'}\nTime: ${new Date().toLocaleString('en-EG')}`;
      break;
    case 'checkin':
      messageBody = `📊 Check-In Submitted\n━━━━━━━━━━━━━━━\nName: ${data.name || '—'}\nWeight: ${data.weight || '—'}\nReadiness: ${data.readiness || '—'}\nAdherence: ${data.adherence || '—'}\nTime: ${new Date().toLocaleString('en-EG')}`;
      break;
    default:
      messageBody = `🔔 Coach Notification\n━━━━━━━━━━━━━━━\nType: ${type}\nData: ${JSON.stringify(data)}\nTime: ${new Date().toLocaleString('en-EG')}`;
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: coachNumber,
        type: 'text',
        text: { body: messageBody },
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      return json({ error: 'whatsapp_api_error' }, 502, env, request);
    }
    return json({ status: 'ok', messageId: result.messages?.[0]?.id }, 200, env, request);
  } catch (err) {
    return json({ error: err.message }, 502, env, request);
  }
}

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

// ── Per-account subscription index (Google sign-in restore) ──
// Key: email:<LOWERED_EMAIL>:subs → [{ code, plan, products, expiresAt, ts }] (TTL 90d)
// Lets a returning Google account restore its bound codes without re-entering them.
async function addAccountSub(env, email, entry) {
  const key = `email:${(email || '').toLowerCase()}:subs`;
  let existing = [];
  try { const raw = await env.ACCESS_CODES.get(key, 'json'); if (Array.isArray(raw)) existing = raw; } catch (e) {}
  const rest = existing.filter(s => s && s.code !== entry.code);
  rest.push({ code: entry.code, plan: entry.plan, products: entry.products, expiresAt: entry.expiresAt, ts: Date.now() });
  await env.ACCESS_CODES.put(key, JSON.stringify(rest), { expirationTtl: 7776000 });
}

async function getAccountSubs(env, email) {
  if (!email) return [];
  let list = [];
  try { const raw = await env.ACCESS_CODES.get(`email:${email.toLowerCase()}:subs`, 'json'); if (Array.isArray(raw)) list = raw; } catch (e) {}
  const now = Date.now();
  return list
    .filter(s => s && s.expiresAt && new Date(s.expiresAt).getTime() > now)
    .map(s => ({ code: s.code, plan: s.plan, products: s.products, expiresAt: s.expiresAt }))
    .sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt));
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
 * Product access rule:
 * - 'all' grants everything
 * - exact product match grants
 * - an omni_hub (OMNI HUB) code is a superset: also valid on the two standalone tools
 */
function productAllowed(recordProducts, productId) {
  if (productId === 'any') return true;
  if (recordProducts === 'all') return true;
  const list = Array.isArray(recordProducts) ? recordProducts : [];
  if (list.includes(productId)) return true;
  if (list.includes('omni_hub') && (productId === 'training_tool' || productId === 'tdee_adaptive_engine')) return true;
  return false;
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
    if (request.method === 'POST' && url.pathname === '/inspect') {
      return this.handleInspect();
    }
    return new Response('Not found', { status: 404 });
  }
  async handleInspect() {
    const record = await this.state.storage.get('record');
    return new Response(JSON.stringify({ record: record || null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    if (!productAllowed(record.products, productId)) {
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
    return new Response(JSON.stringify({ valid: true, uses: record.uses, plan: record.plan, durationDays: record.durationDays, products: record.products }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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


// -- Supabase helpers ------------------------------------------------------
async function sbFetch(env, method, table, body = null, params = '') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase not configured');
  }
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${params}`;
  const headers = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} ${t}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  return null;
}

async function getUserIdFromJwt(request, env) {
  // Reuse existing JWT verification from handleCheckToken logic
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const secret = await getSecret(env);
    const { payload } = await jwtVerify(token, secret);
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}

// -- Profile ----------------------------------------------------------------
async function handleProfileSave(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const body = await request.json();
    const intake = body.intake || {};
    await sbFetch(env, 'POST', 'user_profiles', {
      id: uid,
      intake,
      goal: intake.goal || '',
      experience: String(intake.ta || intake.experience_years || ''),
      bodyweight_kg: intake.weight || intake.bodyweight_kg || null,
    });
    return json({ status: 'ok' }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}

async function handleProfileLoad(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const rows = await sbFetch(env, 'GET', 'user_profiles', null, `?id=eq.${uid}&select=intake,updated_at`);
    return json({ intake: rows?.[0]?.intake || null }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}

// -- Sessions ---------------------------------------------------------------
async function handleSessionSave(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const body = await request.json();
    if (!body.date) return json({ error: 'missing date' }, 400, env, request);
    await sbFetch(env, 'POST', 'workout_sessions', {
      user_id: uid,
      session_date: body.date,
      log: body.log || {},
      load_history: body.load_history || {},
    });
    return json({ status: 'ok' }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}

async function handleSessionLoad(request, env, url) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const days = parseInt(url.searchParams.get('days') || '60');
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const rows = await sbFetch(env, 'GET', 'workout_sessions', null,
      `?user_id=eq.${uid}&session_date=gte.${since}&select=session_date,log,load_history&order=session_date.desc`
    );
    return json({ sessions: rows || [] }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}

// -- Deload -----------------------------------------------------------------
async function handleDeloadSave(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const body = await request.json();
    await sbFetch(env, 'POST', 'deload_tracker', { id: uid, state: body.state || {} });
    return json({ status: 'ok' }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}

async function handleDeloadLoad(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const rows = await sbFetch(env, 'GET', 'deload_tracker', null, `?id=eq.${uid}&select=state`);
    return json({ state: rows?.[0]?.state || null }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}


// -- Bodyweight -------------------------------------------------------------
async function handleBodyweightSave(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const body = await request.json();
    if (!body.weight_kg) return json({ error: 'missing weight_kg' }, 400, env, request);
    await sbFetch(env, 'POST', 'mos_measurements', {
      user_id: uid,
      date: body.date || new Date().toISOString().split('T')[0],
      weight: body.weight_kg,
    });
    return json({ status: 'ok' }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
  }
}

// -- Telegram Link ---------------------------------------------------------
async function handleLinkTelegram(request, env) {
  try {
    const uid = await getUserIdFromJwt(request, env);
    if (!uid) return json({ error: 'unauthorized' }, 401, env, request);
    const body = await request.json();
    const tgId = parseInt(body.telegram_id);
    if (!tgId) return json({ error: 'missing telegram_id' }, 400, env, request);
    await sbFetch(env, 'POST', 'telegram_links', { telegram_id: tgId, user_id: uid });
    return json({ status: 'ok', linked: true }, 200, env, request);
  } catch (e) {
    return json({ error: e.message }, 500, env, request);
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, X-Sync-Passphrase',
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
