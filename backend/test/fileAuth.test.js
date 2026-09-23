/* File-authorization unit tests with a stubbed prisma client (no DB needed). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { authorizeFile } = require('../utils/fileAuth');

function stub({ kycOwner = null, chatBooking = null } = {}) {
  return {
    provider: {
      findFirst: async () => (kycOwner ? { userId: kycOwner } : null),
    },
    message: {
      findFirst: async () => chatBooking,
    },
  };
}
const owner = { id: 'u-owner', role: 'user' };
const stranger = { id: 'u-stranger', role: 'user' };
const admin = { id: 'u-admin', role: 'admin' };

describe('authorizeFile', () => {
  it('avatars and reviews are public without a user', async () => {
    assert.deepEqual(await authorizeFile(stub(), null, 'avatars/a-b.jpg'), { ok: true });
    assert.deepEqual(await authorizeFile(stub(), null, 'reviews/x.png'), { ok: true });
  });

  it('kyc needs authentication', async () => {
    const r = await authorizeFile(stub({ kycOwner: 'u-owner' }), null, 'kyc/k.pdf');
    assert.equal(r.ok, false);
    assert.equal(r.status, 401);
  });

  it('kyc allows owner and admin, denies strangers, 404s unknown keys', async () => {
    assert.equal((await authorizeFile(stub({ kycOwner: 'u-owner' }), owner, 'kyc/k.pdf')).ok, true);
    assert.equal((await authorizeFile(stub({ kycOwner: 'u-owner' }), admin, 'kyc/k.pdf')).ok, true);
    const denied = await authorizeFile(stub({ kycOwner: 'u-owner' }), stranger, 'kyc/k.pdf');
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    const missing = await authorizeFile(stub(), owner, 'kyc/nope.pdf');
    assert.equal(missing.ok, false);
    assert.equal(missing.status, 404);
  });

  it('chat allows booking customer, provider user, and admin only', async () => {
    const booking = { userId: 'u-owner', provider: { userId: 'u-prov' } };
    const db = stub({ chatBooking: { booking } });
    assert.equal((await authorizeFile(db, owner, 'chat/f.png')).ok, true);
    assert.equal((await authorizeFile(db, { id: 'u-prov', role: 'provider' }, 'chat/f.png')).ok, true);
    assert.equal((await authorizeFile(db, admin, 'chat/f.png')).ok, true);
    const denied = await authorizeFile(db, stranger, 'chat/f.png');
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    const missing = await authorizeFile(stub(), owner, 'chat/nope.png');
    assert.equal(missing.status, 404);
  });

  it('unknown prefixes are denied', async () => {
    const r = await authorizeFile(stub(), owner, 'misc/file.txt');
    assert.equal(r.ok, false);
    assert.equal(r.status, 404);
  });
});
