/* Payment helper tests — no network, no DB. */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

delete process.env.ESEWA_MERCHANT;
delete process.env.ESEWA_SECRET_KEY;
delete process.env.KHALTI_SECRET_KEY;

const {
  checkWalletRef, liveCapable, verifyPaymentRef, signEsewaRequest,
} = require('../utils/payments');

describe('checkWalletRef', () => {
  it('cash always passes', () => {
    assert.equal(checkWalletRef('cash', '').ok, true);
  });
  it('rejects short / dirty references', () => {
    assert.equal(checkWalletRef('esewa', 'ab').ok, false);
    assert.equal(checkWalletRef('khalti', 'TXN$$!!').ok, false);
  });
  it('rejects suspiciously short wallet ids', () => {
    assert.equal(checkWalletRef('esewa', 'abc123').ok, false);
  });
  it('accepts full transaction ids', () => {
    assert.equal(checkWalletRef('esewa', 'TXN12345678').ok, true);
    assert.equal(checkWalletRef('khalti', 'pidx_abcdef123456').ok, true);
    assert.equal(checkWalletRef('bank', 'REF 2024-001').ok, true);
  });
});

describe('live verification without keys', () => {
  it('reports not live-capable', () => {
    assert.equal(liveCapable('esewa'), false);
    assert.equal(liveCapable('khalti'), false);
    assert.equal(liveCapable('cash'), false);
  });
  it('verify falls back to format mode (claim recorded, provider confirms)', async () => {
    const r = await verifyPaymentRef({ method: 'esewa', reference: 'TXN12345678', amount: 1000 });
    assert.equal(r.ok, true);
    assert.equal(r.verified, false);
    assert.equal(r.mode, 'format');
  });
  it('bad format never verifies', async () => {
    const r = await verifyPaymentRef({ method: 'esewa', reference: 'x', amount: 1000 });
    assert.equal(r.ok, false);
    assert.equal(r.verified, false);
  });
});

describe('signEsewaRequest', () => {
  beforeEach(() => {
    process.env.ESEWA_MERCHANT = 'EPAYTEST';
    process.env.ESEWA_SECRET_KEY = '8gBm/:&EnhH.1/q';
  });
  it('produces a base64 HMAC signature over the signed fields', () => {
    const { signature, signedFieldNames } = signEsewaRequest({ totalAmount: 1100, transactionUuid: 'TXN-1' });
    assert.equal(signedFieldNames, 'total_amount,transaction_uuid,product_code');
    assert.match(signature, /^[A-Za-z0-9+/=]{44}$/);
    assert.equal(liveCapable('esewa'), true);
  });
});
