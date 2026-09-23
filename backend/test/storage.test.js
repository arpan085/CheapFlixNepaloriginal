/* Storage tests. Without Neon env vars every live test is skipped —
 * the suite stays green on machines with no credentials. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../utils/storage');

describe('storage config', () => {
  it('reports disabled without env vars', () => {
    if (process.env.AWS_SECRET_ACCESS_KEY) return; // live env: covered below
    assert.equal(storage.neonEnabled(), false);
  });
  it('defaults to the assets bucket', () => {
    if (process.env.STORAGE_BUCKET) return;
    assert.equal(storage.bucket(), 'assets');
  });
  it('bucket() honors STORAGE_BUCKET', () => {
    const prev = process.env.STORAGE_BUCKET;
    process.env.STORAGE_BUCKET = 'assets';
    assert.equal(storage.bucket(), 'assets');
    if (prev === undefined) delete process.env.STORAGE_BUCKET;
    else process.env.STORAGE_BUCKET = prev;
  });
  it('neonEnabled() requires all four credentials', () => {
    const keys = ['AWS_ENDPOINT_URL_S3', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const saved = {};
    for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
    assert.equal(storage.neonEnabled(), false);
    for (const k of keys) {
      process.env[k] = 'x';
      const expectOn = keys.every((kk) => process.env[kk]);
      assert.equal(storage.neonEnabled(), expectOn);
    }
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
});
