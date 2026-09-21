/* Rate-limiter tests with fake req/res (no server needed). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit, loginLimiter, globalLimiter } = require('../middleware/security');

function fakeReq(ip = '1.2.3.4', body = {}) {
  return { ip, baseUrl: '/api/auth', headers: {}, body };
}
function fakeRes() {
  const headers = {};
  return {
    headers,
    setHeader: (k, v) => { headers[k] = v; },
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}
function run(limiter, req) {
  return new Promise((resolve) => {
    const res = fakeRes();
    limiter(req, res, () => resolve({ blocked: false, res }));
    if (res.body) resolve({ blocked: res.statusCode === 429, res });
    // sync middleware: if next() wasn't called and no body, it blocked
    setImmediate(() => resolve({ blocked: res.statusCode === 429, res }));
  });
}

describe('rateLimit', () => {
  it('allows traffic under the max and sets headers', async () => {
    const lim = rateLimit({ windowMs: 60000, max: 2 });
    const r1 = await run(lim, fakeReq());
    assert.equal(r1.blocked, false);
    assert.equal(r1.res.headers['RateLimit-Limit'], '2');
    assert.equal(r1.res.headers['RateLimit-Remaining'], '1');
  });
  it('returns 429 with Retry-After over the max', async () => {
    const lim = rateLimit({ windowMs: 60000, max: 2, message: 'slow down' });
    const req = fakeReq('9.9.9.9');
    await run(lim, req);
    await run(lim, req);
    const over = await run(lim, req);
    assert.equal(over.blocked, true);
    assert.equal(over.res.statusCode, 429);
    assert.ok(Number(over.res.headers['Retry-After']) >= 1);
    assert.equal(over.res.body.error, 'slow down');
  });
  it('keys login attempts per email too', async () => {
    const reqA = () => fakeReq('5.5.5.5', { email: 'a@x.com' });
    const reqB = () => fakeReq('5.5.5.5', { email: 'b@x.com' });
    await run(loginLimiter, reqA());
    // different email on same IP must not be blocked by the first's budget
    let blocked = false;
    for (let i = 0; i < 10; i++) {
      const r = await run(loginLimiter, reqB());
      if (r.blocked) blocked = true;
    }
    assert.equal(blocked, false);
  });
  it('global limiter exports exist', () => {
    assert.equal(typeof globalLimiter, 'function');
    assert.equal(typeof loginLimiter, 'function');
  });
});
