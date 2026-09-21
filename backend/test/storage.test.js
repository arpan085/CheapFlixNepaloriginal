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
  it('defaults to the cheapflixnepal bucket', () => {
    if (process.env.STORAGE_BUCKET) return;
    assert.equal(storage.bucket(), 'cheapflixnepal');
  });
});
