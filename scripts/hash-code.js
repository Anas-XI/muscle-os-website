/**
 * Hash a code for use in access-codes.json
 * Usage: node hash-code.js <code> [productId] [plan] [durationDays]
 *
 * Examples:
 *   node hash-code.js MASTER123
 *   node hash-code.js TOOLCODE training_tool single_product 30
 *   node hash-code.js BOOKCODE nutrition_book book 0
 */

const crypto = require('crypto');

const code = process.argv[2];
if (!code) {
  console.error('Usage: node hash-code.js <code> [productId] [plan] [durationDays]');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
const productId = process.argv[3] || null;
const plan = process.argv[4] || (productId ? 'single_product' : 'master');
let durationDays = process.argv[5] !== undefined ? parseInt(process.argv[5]) : (productId ? 30 : 0);

const entry = { plan };
if (productId) {
  entry.products = [productId];
} else {
  entry.products = 'all';
  durationDays = 30;
}
if (durationDays > 0) entry.durationDays = durationDays;

console.log('\n=== HASHED CODE ===\n');
console.log(`Plaintext: ${code.trim().toUpperCase()}`);
console.log(`SHA-256:   ${hash}\n`);
console.log('Add this to access-codes.json:\n');
console.log(JSON.stringify({ [hash]: entry }, null, 2));
console.log('\n');
