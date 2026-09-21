/* Neon Object Storage (S3-compatible) for uploads.
 * Buckets are private, so files are stored by key and served through
 * GET /api/files/<key>, which 302-redirects to a 1-hour presigned URL.
 * Keys are random and unguessable — same exposure model as the old
 * public /uploads/... folder, but files now survive redeploys.
 *
 * Env (pulled automatically by `neon link` into root .env.local —
 * copy these four into backend/.env for local dev):
 *   AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID,
 *   AWS_SECRET_ACCESS_KEY, STORAGE_BUCKET (default "cheapflixnepal")
 */
const fs = require('fs');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function bucket() {
  return process.env.STORAGE_BUCKET || 'cheapflixnepal';
}

function neonEnabled() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

let _client = null;
function client() {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

/* Upload a multer-saved file. Returns the storage key, e.g.
 * "avatars/abc123-1700000000000-42.jpg". Throws on failure. */
async function putFile(sub, file) {
  const safeSub = String(sub || 'misc').replace(/[^A-Za-z0-9_-]/g, '');
  const rand = crypto.randomBytes(8).toString('hex');
  const ext = (file.originalname || '').toLowerCase().match(/\.(jpe?g|png|webp|pdf)$/)?.[0] || '';
  const key = `${safeSub}/${Date.now()}-${rand}${ext}`;
  const body = fs.readFileSync(file.path);
  await client().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: body,
    ContentType: file.mimetype || 'application/octet-stream',
  }));
  return key;
}

/* Short-lived public URL for a key (bucket stays private). */
async function presignedGetUrl(key, expiresIn = 3600) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn });
}

module.exports = { bucket, neonEnabled, putFile, presignedGetUrl };
