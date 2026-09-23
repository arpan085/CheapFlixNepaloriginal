/* Booking validation + pricing tests (no DB needed). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateBookingCreate } = require('../middleware/validate');
const { expectedTotal } = require('../utils/promos');

async function runChain(body) {
  const req = { body };
  let status = 200;
  let payload = null;
  const res = {
    status(c) { status = c; return this; },
    json(b) { payload = b; return this; },
  };
  for (const mw of validateBookingCreate) {
    let nexted = false;
    await mw(req, res, () => { nexted = true; });
    if (!nexted) break; // response already sent (validation failed)
  }
  return { status, payload };
}

function validBody() {
  return {
    providerId: 'prov-1',
    serviceId: 'svc-1',
    date: '2026-10-01',
    startTime: '10:00 AM',
    duration: '1 hour',
    totalAmount: 840,
    location: 'Baneshwor',
    paymentMethod: 'cash',
  };
}

describe('validateBookingCreate', () => {
  it('accepts a complete booking payload', async () => {
    const r = await runChain(validBody());
    assert.equal(r.status, 200);
    assert.equal(r.payload, null);
  });
  it('rejects a missing serviceId', async () => {
    const b = validBody();
    delete b.serviceId;
    const r = await runChain(b);
    assert.equal(r.status, 400);
    assert.match(r.payload.error, /service/i);
  });
  it('rejects a missing providerId', async () => {
    const b = validBody();
    delete b.providerId;
    const r = await runChain(b);
    assert.equal(r.status, 400);
  });
  it('rejects a non-ISO date', async () => {
    const b = validBody();
    b.date = 'tomorrow-ish';
    const r = await runChain(b);
    assert.equal(r.status, 400);
  });
  it('rejects an invalid payment method', async () => {
    const b = validBody();
    b.paymentMethod = 'barter';
    const r = await runChain(b);
    assert.equal(r.status, 400);
  });
});

describe('booking price calculation', () => {
  it('hourly x hours + 5% fee', () => {
    assert.equal(expectedTotal(800, '1 hour'), 840);
    assert.equal(expectedTotal(600, '2 hours'), 1260);
  });
  it('returns null for unparseable input', () => {
    assert.equal(expectedTotal(0, '2 hours'), null);
    assert.equal(expectedTotal(600, 'sometime'), null);
  });
});
