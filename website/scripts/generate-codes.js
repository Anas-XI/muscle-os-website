/**
 * Code Generator + Seeder for Muscle OS
 * 
 * Usage:
 *   node generate-codes.js                    # generate + print codes
 *   node generate-codes.js --seed             # generate + seed to KV
 *   node generate-codes.js --seed --admin KEY  # seed with custom admin key
 */
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Config ──
const ADMIN_KEY = process.env.ADMIN_KEY || process.argv[4] || 'MOS-ADMIN-DEV-2026';
const API_BASE = 'https://muscleos-access-control.muscleos.workers.dev';
const WORKER_DIR = path.resolve(__dirname, '..', 'worker');

// ── Code generation ──
function generateCode(prefix, length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 for readability
  let code = prefix ? prefix + '-' : '';
  for (let i = 0; i < length; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

const CODE_TEMPLATES = [
  {
    label: 'Training App — 1 month',
    prefix: 'TR',
    products: ['training_tool'],
    plan: 'training_tool',
    durationDays: 30,
  },
  {
    label: 'Training App — 3 months',
    prefix: 'TR',
    products: ['training_tool'],
    plan: 'training_tool',
    durationDays: 90,
  },
  {
    label: 'TDEE Engine — 1 month',
    prefix: 'TD',
    products: ['tdee_adaptive_engine'],
    plan: 'tdee_adaptive_engine',
    durationDays: 30,
  },
  {
    label: 'Training Bundle — 1 month',
    prefix: 'TB',
    products: ['training_tool', 'tdee_adaptive_engine'],
    plan: 'bundle',
    durationDays: 30,
  },
  {
    label: 'Training Book — lifetime',
    prefix: 'BK',
    products: ['training_book'],
    plan: 'single_product',
    durationDays: 0, // lifetime
  },
  {
    label: 'Nutrition Book — lifetime',
    prefix: 'BN',
    products: ['nutrition_book'],
    plan: 'single_product',
    durationDays: 0,
  },
  {
    label: 'Both Books — lifetime',
    prefix: 'BB',
    products: ['training_book', 'nutrition_book'],
    plan: 'master',
    durationDays: 0,
  },
  {
    label: 'All Access — 1 month',
    prefix: 'MA',
    products: 'all',
    plan: 'master',
    durationDays: 30,
  },
];

// ── Seed via Worker admin API ──
async function seedCode(template) {
  const code = generateCode(template.prefix);
  const payload = {
    code,
    products: template.products,
    plan: template.plan,
    durationDays: template.durationDays,
    maxUses: 1,
    _label: template.label, // reference only, ignored by Worker
  };

  if (process.argv.includes('--seed')) {
    const url = `${API_BASE}/api/issue-code`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
      return { ...payload, code, label: template.label, status: 'SEEDED' };
    } else {
      return { ...payload, code, label: template.label, status: `FAILED: ${data.error || response.status}` };
    }
  } catch (e) {
    return { ...payload, code, label: template.label, status: `NETWORK_ERROR: ${e.message}` };
  }

  return { ...payload, code, label: template.label, status: 'GENERATED (not seeded)' };
}

// ── Set ADMIN_KEY secret ──
function ensureAdminKey() {
  if (process.argv.includes('--seed') && !process.argv.includes('--admin')) {
    try {
      execSync(`echo ${ADMIN_KEY} | npx wrangler secret put ADMIN_KEY`, {
        cwd: WORKER_DIR, stdio: 'pipe', timeout: 30000,
      });
      console.log('ADMIN_KEY secret set.');
    } catch (e) {
      console.log('Note: ADMIN_KEY may already be set.');
    }
  }
}

// ── Main ──
async function main() {
  console.log('=== Muscle OS Code Generator ===\n');

  if (process.argv.includes('--seed')) {
    ensureAdminKey();
    console.log(`Admin API: ${API_BASE}/api/issue-code\n`);
  }

  const results = [];
  for (const template of CODE_TEMPLATES) {
    const result = await seedCode(template);
    results.push(result);
    const icon = result.status === 'SEEDED' ? '✅' : result.status.startsWith('GENERATED') ? '🔷' : '❌';
    console.log(`${icon} ${result.label}`);
    console.log(`   Code: ${result.code}`);
    console.log(`   Products: ${Array.isArray(result.products) ? result.products.join(', ') : result.products}`);
    console.log(`   Duration: ${result.durationDays || 'LIFETIME'} days`);
    console.log(`   Status: ${result.status}\n`);
  }

  // Summary for coach
  console.log('═══════════════════════════════════════');
  console.log('  COACH SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log();
  for (const r of results) {
    console.log(`  ${r.code}  →  ${r.label}`);
  }

  if (!process.argv.includes('--seed')) {
    console.log('\nRun with --seed to push codes to the Worker KV:');
    console.log('  node generate-codes.js --seed');
  }
}

main().catch(console.error);
