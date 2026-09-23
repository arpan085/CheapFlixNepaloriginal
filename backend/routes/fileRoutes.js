/* Serves Neon-stored uploads. Buckets are private, so this endpoint
 * 302-redirects to a 1-hour presigned URL.
 *
 * Access policy (see utils/fileAuth.js):
 * - avatars/*, reviews/* are public (profile + review photos render for
 *   logged-out visitors; keys are random hex and unguessable).
 * - kyc/* needs the owner provider or an admin.
 * - chat/* needs a user involved in the related booking, or an admin.
 * - anything else is denied.
 * Guessing a key never grants access to someone else's private file. */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../config/database');
const { neonEnabled, presignedGetUrl } = require('../utils/storage');
const { authorizeFile } = require('../utils/fileAuth');

const KEY_RE = /^[A-Za-z0-9_\-/][A-Za-z0-9_\-/.]*$/;

function extractKey(req, res) {
  const key = String((req.params && req.params[0]) || '').replace(/^\/+/, '');
  if (!key || key.includes('..') || !KEY_RE.test(key)) {
    res.status(400).json({ error: 'Invalid file key' });
    return null;
  }
  return key;
}

async function serveKey(key, res) {
  try {
    if (!neonEnabled()) return res.status(503).json({ error: 'Object storage is not configured' });
    const url = await presignedGetUrl(key);
    return res.redirect(302, url);
  } catch (e) {
    console.error('[files] serve failed');
    return res.status(404).json({ error: 'File not found' });
  }
}

// Public prefixes first (Express matches in order).
// NOTE: Express strips the matched prefix — `*` captures only the part
// AFTER `avatars/`, so the storage key must be rebuilt with the prefix
// (stored keys look like `avatars/<rand>.jpg`). Missing this returned
// 404 for every Neon-hosted photo and the UI fell back to initials.
router.get('/files/avatars/*', async (req, res) => {
  const tail = extractKey(req, res);
  if (tail) await serveKey(tail.startsWith('avatars/') ? tail : 'avatars/' + tail, res);
});
router.get('/files/reviews/*', async (req, res) => {
  const tail = extractKey(req, res);
  if (tail) await serveKey(tail.startsWith('reviews/') ? tail : 'reviews/' + tail, res);
});

// Everything else: authenticated + ownership-checked.
router.get('/files/*', authMiddleware, async (req, res) => {
  try {
    const key = extractKey(req, res);
    if (!key) return;
    const verdict = await authorizeFile(prisma, req.user, key);
    if (!verdict.ok) return res.status(verdict.status || 403).json({ error: verdict.error });
    await serveKey(key, res);
  } catch (e) {
    console.error('[files] authorize failed');
    return res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;
