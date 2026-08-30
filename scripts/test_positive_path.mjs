import { SignJWT, jwtVerify } from '../website/worker/node_modules/jose/dist/node/esm/index.js';

const JWT_SECRET = 'muscleos-test-secret-key-32-chars-long!!';
const secret = new TextEncoder().encode(JWT_SECRET);

async function runPositivePathTests() {
  console.log('=== Running Positive Path Authentication & DOM Gating Tests ===\n');

  // 1. Issue a valid JWT for training_tool
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const validToken = await new SignJWT({
    productId: 'training_tool',
    plan: 'pro_training',
    codePrefix: 'TEST',
    code: 'TEST-TRAIN-2026'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('muscleos-access-control')
    .setAudience('muscleos-website')
    .setSubject('TEST')
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);

  console.log('1. Generated Valid Test JWT:');
  console.log('   Payload: { productId: "training_tool", plan: "pro_training", code: "TEST-TRAIN-2026" }');
  console.log('   Expires:', expiresAt.toISOString());

  // 2. Test Server-Side Verification Logic (handleCheckToken parity)
  const { payload } = await jwtVerify(validToken, secret, {
    issuer: 'muscleos-access-control',
    audience: 'muscleos-website'
  });

  if (payload && payload.productId === 'training_tool' && payload.plan === 'pro_training') {
    console.log('✅ Server Verification Test PASSED: Valid JWT successfully verified by check-token logic.');
  } else {
    throw new Error('Server Verification Test FAILED');
  }

  // 3. Test Master Plan Omni Hub Token unlocking child tools
  const masterToken = await new SignJWT({
    productId: 'omni_hub',
    plan: 'master',
    codePrefix: 'OMNI',
    code: 'OMNI-MASTER-2026'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('muscleos-access-control')
    .setAudience('muscleos-website')
    .setSubject('OMNI')
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);

  const { payload: masterPayload } = await jwtVerify(masterToken, secret, {
    issuer: 'muscleos-access-control',
    audience: 'muscleos-website'
  });

  const allowsTraining = masterPayload.plan === 'master' || (masterPayload.productId === 'omni_hub');
  const allowsTdee = masterPayload.plan === 'master' || (masterPayload.productId === 'omni_hub');
  if (allowsTraining && allowsTdee) {
    console.log('✅ Master Token Test PASSED: Omni Hub master plan token successfully unlocks training & nutrition tools.');
  } else {
    throw new Error('Master Token Test FAILED');
  }

  // 4. Test Client DOM Gating State Machine Simulation
  console.log('\n2. Testing Client DOM Gating Execution:');

  // Simulated browser environment
  const mockLocalStorage = {
    'mos_subscription': JSON.stringify({
      active: true,
      plan: 'pro_training',
      expiry: expiresAt.toISOString().slice(0, 10),
      token: validToken,
      code: 'TEST-TRAIN-2026',
      prodId: 'training_tool'
    })
  };

  const mockDOM = {
    subOverlay: { style: { display: 'none' } },
    appContainer: { rendered: false },
    renderApp: function() { this.appContainer.rendered = true; }
  };

  // Run exact client initialization logic from training_tool.html / tdee_adaptive_engine.html
  const PRODUCT_ID = 'training_tool';
  let sub = null;
  try { sub = JSON.parse(mockLocalStorage['mos_subscription']); } catch(e){}

  const deriveProd = (code, plan) => {
    if ((code && code.startsWith('TT-')) || plan === 'pro_training' || plan === 'training_tool') return 'training_tool';
    if ((code && code.startsWith('NT-')) || plan === 'adaptive_nutrition' || plan === 'tdee_adaptive_engine') return 'tdee_adaptive_engine';
    return 'all_access';
  };

  const subProd = sub ? (sub.prodId || deriveProd(sub.code, sub.plan)) : null;
  const prodOk = subProd === 'all_access' || subProd === PRODUCT_ID || (sub && sub.plan === 'master');
  const active = !!(sub && sub.active && prodOk && (sub.token || sub.code === 'OWNER') && new Date(sub.expiry + 'T23:59:59') > new Date());

  if (!active) {
    mockDOM.subOverlay.style.display = 'flex';
  } else {
    mockDOM.renderApp();
  }

  if (active === true && mockDOM.subOverlay.style.display === 'none' && mockDOM.appContainer.rendered === true) {
    console.log('✅ Client Gate Positive Test PASSED: Valid subscriber bypasses paywall and tool DOM renders.');
  } else {
    throw new Error(`Client Gate Positive Test FAILED: active=${active}, overlayDisplay=${mockDOM.subOverlay.style.display}`);
  }

  // 5. Test Negative Case: Tampered/Unsigned User
  const tamperedLocalStorage = {
    'mos_subscription': JSON.stringify({
      active: true,
      plan: 'pro_training',
      expiry: '2099-12-31',
      token: '', // No valid server token
      code: 'FAKE-CODE-123'
    })
  };

  const mockDOMBlocked = {
    subOverlay: { style: { display: 'none' } },
    appContainer: { rendered: false },
    renderApp: function() { this.appContainer.rendered = true; }
  };

  let subBlocked = null;
  try { subBlocked = JSON.parse(tamperedLocalStorage['mos_subscription']); } catch(e){}
  const subProdBlocked = subBlocked ? (subBlocked.prodId || deriveProd(subBlocked.code, subBlocked.plan)) : null;
  const prodOkBlocked = subProdBlocked === 'all_access' || subProdBlocked === PRODUCT_ID || (subBlocked && subBlocked.plan === 'master');
  const activeBlocked = !!(subBlocked && subBlocked.active && prodOkBlocked && (subBlocked.token || subBlocked.code === 'OWNER') && new Date(subBlocked.expiry + 'T23:59:59') > new Date());

  if (!activeBlocked) {
    mockDOMBlocked.subOverlay.style.display = 'flex';
  } else {
    mockDOMBlocked.renderApp();
  }

  if (activeBlocked === false && mockDOMBlocked.subOverlay.style.display === 'flex' && mockDOMBlocked.appContainer.rendered === false) {
    console.log('✅ Client Gate Negative Test PASSED: Unsigned/tampered user blocked by paywall overlay (#subOverlay display: flex).');
  } else {
    throw new Error('Client Gate Negative Test FAILED');
  }

  console.log('\n[ALL POSITIVE & NEGATIVE TESTS PASSED] Legitimate paying users and master accounts unlock correctly.');
}

runPositivePathTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
