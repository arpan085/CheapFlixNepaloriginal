/* Promo engine tests — pure units with a fake prisma (no DB needed). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  hoursFromDuration, expectedTotal, validatePromo, recordPromoUse, refCodeFor,
} = require('../utils/promos');

function fakePrisma({ bookings = 0, referrer = null, promoRow = null, throwOnPromo = false } = {}) {
  return {
    booking: { count: async () => bookings },
    user: { findFirst: async () => referrer },
    promoCode: {
      findUnique: async () => {
        if (throwOnPromo) throw new Error('no such table');
        return promoRow;
      },
      update: async () => ({ ...promoRow, usedCount: (promoRow?.usedCount || 0) + 1 }),
    },
  };
}

describe('hoursFromDuration', () => {
  it('parses booking labels', () => {
    assert.equal(hoursFromDuration('Up to 1 hr'), 1);
    assert.equal(hoursFromDuration('2 hours'), 2);
    assert.equal(hoursFromDuration('Half day (4 hrs)'), 4);
    assert.equal(hoursFromDuration('Full day (8 hrs)'), 8);
  });
  it('rejects garbage', () => {
    assert.equal(hoursFromDuration(''), 0);
    assert.equal(hoursFromDuration('sometime'), 0);
    assert.equal(hoursFromDuration('99 hours'), 0); // >24h cap
  });
});

describe('expectedTotal', () => {
  it('applies hourly x hours + 5% fee', () => {
    assert.equal(expectedTotal(600, '2 hours'), 1260);
    assert.equal(expectedTotal(800, 'Up to 1 hr'), 840);
  });
  it('returns null on bad input', () => {
    assert.equal(expectedTotal(0, '2 hours'), null);
    assert.equal(expectedTotal(600, 'sometime'), null);
  });
});

describe('validatePromo (static codes)', () => {
  it('needs a code', async () => {
    const r = await validatePromo(fakePrisma(), { code: '', userId: 'u1', subtotal: 1000 });
    assert.equal(r.ok, false);
  });
  it('WELCOME10 gives 10% capped at 500', async () => {
    const r = await validatePromo(fakePrisma(), { code: 'welcome10', userId: 'u1', subtotal: 10000 });
    assert.equal(r.ok, true);
    assert.equal(r.discount, 500);
  });
  it('WELCOME10 enforces min total', async () => {
    const r = await validatePromo(fakePrisma(), { code: 'WELCOME10', userId: 'u1', subtotal: 300 });
    assert.equal(r.ok, false);
  });
  it('NAMASTE200 is first-booking-only', async () => {
    const no = await validatePromo(fakePrisma({ bookings: 1 }), { code: 'NAMASTE200', userId: 'u1', subtotal: 1000 });
    assert.equal(no.ok, false);
    const yes = await validatePromo(fakePrisma({ bookings: 0 }), { code: 'NAMASTE200', userId: 'u1', subtotal: 1000 });
    assert.equal(yes.ok, true);
    assert.equal(yes.discount, 200);
  });
  it('rejects unknown codes', async () => {
    const r = await validatePromo(fakePrisma(), { code: 'FAKE99', userId: 'u1', subtotal: 1000 });
    assert.equal(r.ok, false);
  });
});

describe('validatePromo (referrals)', () => {
  it('rejects unknown referral suffixes', async () => {
    const r = await validatePromo(fakePrisma({ bookings: 0, referrer: null }),
      { code: 'REF-ABC123', userId: 'newbie', subtotal: 1000 });
    assert.equal(r.ok, false);
  });
  it('credits Rs 200 for first bookings', async () => {
    // referrer id must endWith the code suffix (lowercased)
    const r = await validatePromo(fakePrisma({ bookings: 0, referrer: { id: 'xxuserf1' } }),
      { code: 'REF-USERF1', userId: 'newbie', subtotal: 1000 });
    assert.equal(r.ok, true);
    assert.equal(r.discount, 200);
  });
  it('blocks self-referral and repeat bookings', async () => {
    const self = await validatePromo(fakePrisma({ bookings: 0, referrer: { id: 'myuserf1' } }),
      { code: 'REF-USERF1', userId: 'myuserf1', subtotal: 1000 });
    assert.equal(self.ok, false);
    const repeat = await validatePromo(fakePrisma({ bookings: 2, referrer: { id: 'xxuserf1' } }),
      { code: 'REF-USERF1', userId: 'newbie', subtotal: 1000 });
    assert.equal(repeat.ok, false);
  });
});

describe('validatePromo (DB codes)', () => {
  const row = {
    code: 'DASHAIN15', label: '15% off', type: 'pct', value: 15,
    maxOff: 750, minTotal: 1000, firstBookingOnly: false,
    active: true, expiresAt: null, usageLimit: 100, usedCount: 3,
  };
  it('applies pct with cap', async () => {
    const r = await validatePromo(fakePrisma({ promoRow: row }), { code: 'dashain15', userId: 'u1', subtotal: 10000 });
    assert.equal(r.ok, true);
    assert.equal(r.discount, 750);
    assert.equal(r.promo.code, 'DASHAIN15');
  });
  it('enforces active/expiry/limits/minimums', async () => {
    for (const patch of [
      { active: false }, { expiresAt: new Date(Date.now() - 1000) },
      { usedCount: 100 }, { minTotal: 99999 },
    ]) {
      const r = await validatePromo(fakePrisma({ promoRow: { ...row, ...patch } }), { code: 'DASHAIN15', userId: 'u1', subtotal: 10000 });
      assert.equal(r.ok, false, JSON.stringify(patch));
    }
  });
  it('falls back to static codes when the table is missing', async () => {
    const r = await validatePromo(fakePrisma({ throwOnPromo: true }), { code: 'WELCOME10', userId: 'u1', subtotal: 1000 });
    assert.equal(r.ok, true);
    assert.equal(r.discount, 100);
  });
});

describe('recordPromoUse / refCodeFor', () => {
  it('never throws (static code or missing table)', async () => {
    await recordPromoUse(fakePrisma({ throwOnPromo: true }), 'WELCOME10');
    await recordPromoUse(fakePrisma(), 'WELCOME10');
  });
  it('derives referral codes from user id', () => {
    assert.equal(refCodeFor('abc123456'), 'REF-123456');
  });
});
