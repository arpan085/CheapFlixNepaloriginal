/* Token tests. DB is pointed at a dead port on purpose: issuePair must
 * degrade to access-token-only instead of throwing (pre-migration safety). */
process.env.DATABASE_URL = 'mysql://user:pass@127.0.0.1:1/cheapflix_test';
process.env.JWT_SECRET = 'test-secret-12345678901234567890';
delete process.env.JWT_EXPIRE;

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { accessToken, hashRefresh, rotate, revoke, issuePair } = require('../utils/tokens');

describe('accessToken', () => {
  it('defaults to a 12h lifetime', () => {
    const p = jwt.decode(accessToken({ id: '1', email: 'a@b.c', role: 'user' }));
    assert.equal(p.exp - p.iat, 12 * 60 * 60);
    assert.equal(p.role, 'user');
  });
});

describe('hashRefresh', () => {
  it('is a deterministic 64-char sha256 hex', () => {
    const a = hashRefresh('abc');
    assert.equal(a.length, 64);
    assert.equal(a, hashRefresh('abc'));
    assert.notEqual(a, hashRefresh('abd'));
  });
});

describe('rotate / revoke', () => {
  it('rejects a missing token before touching the DB', async () => {
    await assert.rejects(() => rotate(''), (e) => e.status === 400);
    await assert.rejects(() => rotate(undefined), (e) => e.status === 400);
  });
  it('revoke of nothing resolves quietly', async () => {
    assert.equal(await revoke(''), undefined);
    assert.equal(await revoke(null), undefined);
  });
});

describe('issuePair without a reachable DB', () => {
  it('still returns an access token (refresh null)', async () => {
    const pair = await issuePair({ id: 'u1', email: 'a@b.c', role: 'user' });
    assert.ok(pair.token);
    assert.equal(pair.refreshToken, null);
  });
});
