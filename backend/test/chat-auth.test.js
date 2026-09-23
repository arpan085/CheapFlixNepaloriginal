const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-tests';
const { authorizeFile } = require('../utils/fileAuth');
const { authMiddleware } = require('../middleware/auth');

test('chat attachment authorization allows booking participants only', async () => {
  const prisma = {
    message: {
      findFirst: async () => ({
        booking: { userId: 'customer-1', provider: { userId: 'provider-1' } }
      })
    }
  };
  assert.deepEqual(await authorizeFile(prisma, { id: 'customer-1', role: 'user' }, 'chat/file.png'), { ok: true });
  assert.deepEqual(await authorizeFile(prisma, { id: 'provider-1', role: 'provider' }, 'chat/file.png'), { ok: true });
  assert.equal((await authorizeFile(prisma, { id: 'stranger', role: 'user' }, 'chat/file.png')).status, 403);
  assert.deepEqual(await authorizeFile(prisma, { id: 'admin', role: 'admin' }, 'chat/file.png'), { ok: true });
});

test('auth middleware rejects malformed and accepts valid bearer tokens', () => {
  const token = jwt.sign({ id: 'user-1', role: 'user' }, process.env.JWT_SECRET);
  const okReq = { headers: { authorization: `Bearer ${token}` } };
  let called = false;
  authMiddleware(okReq, { status: () => ({ json: () => {} }) }, () => { called = true; });
  assert.equal(called, true);

  const badReq = { headers: { authorization: 'Bearer invalid-token' } };
  let statusCode = 0;
  authMiddleware(badReq, { status: (code) => { statusCode = code; return { json: () => {} }; } }, () => {});
  assert.equal(statusCode, 401);
});
