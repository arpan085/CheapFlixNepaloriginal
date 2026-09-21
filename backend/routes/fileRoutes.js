/* Serves Neon-stored uploads. Buckets are private, so this endpoint
 * 302-redirects to a 1-hour presigned URL. Keys are random hex —
 * unguessable, same exposure as the old public /uploads/ folder. */
const express = require('express');
const router = express.Router();
const { neonEnabled, presignedGetUrl } = require('../utils/storage');

router.get('/files/*', async (req, res) => {
  try {
    if (!neonEnabled()) return res.status(503).json({ error: 'Object storage is not configured' });
    const key = String(req.params[0] || '').replace(/^\/+/, '');
    if (!key || key.includes('..') || !/^[A-Za-z0-9_\-/][A-Za-z0-9_\-/.]*$/.test(key)) {
      return res.status(400).json({ error: 'Invalid file key' });
    }
    const url = await presignedGetUrl(key);
    return res.redirect(302, url);
  } catch (e) {
    console.error('[files] serve failed:', e.message);
    return res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;
