const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { avatarUpload, storeFile } = require('../middleware/upload');
const prisma = require('../config/database');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        address: true,
        city: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile — writes an audit row, clears the public provider
// cache, and broadcasts `profile_updated` so every open browser (public
// cards, provider pages, admin tables) refreshes instantly.
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, bio, address, city, avatar } = req.body;

    const before = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { firstName: true, lastName: true, phone: true, bio: true, address: true, city: true, avatar: true },
    });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        bio: bio === undefined ? undefined : String(bio).slice(0, 1000),
        address: address || undefined,
        city: city || undefined,
        avatar: avatar || undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        address: true,
        city: true,
        avatar: true
      }
    });

    // Audit + realtime fan-out (never fail the save if these fail).
    try {
      const { diffFields, writeAudit } = require('../utils/audit');
      const { broadcast, emitTo } = require('../utils/events');
      const changes = diffFields(before || {}, user, ['firstName', 'lastName', 'phone', 'bio', 'address', 'city', 'avatar']);
      const actorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      await writeAudit({
        actorId: user.id, actorName, actorRole: req.user.role || 'user',
        targetUserId: user.id, targetName: actorName,
        action: 'profile_updated', changes,
      });
      try { require('./providerRoutes').clearCache(); } catch (e) {}
      const payload = { userId: user.id, changes: Object.keys(changes), user };
      broadcast('profile_updated', payload);
      emitTo(user.id, 'profile_updated', payload);
    } catch (e) { /* realtime is best-effort */ }

    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload profile avatar (any logged-in user). 1 image, max 2MB.
router.post('/avatar', authMiddleware, avatarUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach an image as "avatar".' });
    const url = await storeFile(req, 'avatars', req.file);
    const user = await prisma.user.update({
      where: { id: String(req.user.id) },
      data: { avatar: url },
      select: { id: true, avatar: true, firstName: true, lastName: true, email: true }
    });
    try {
      const { writeAudit } = require('../utils/audit');
      const { broadcast } = require('../utils/events');
      const actorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      await writeAudit({
        actorId: user.id, actorName, actorRole: req.user.role || 'user',
        targetUserId: user.id, targetName: actorName,
        action: 'avatar_updated', changes: { avatar: { from: '', to: url } },
      });
      try { require('./providerRoutes').clearCache(); } catch (e) {}
      broadcast('profile_updated', { userId: user.id, changes: ['avatar'], user });
    } catch (e) {}
    res.json({ success: true, message: 'Avatar updated', data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove profile avatar (back to initials). Called by the dashboard,
// provider dashboard and onboarding "Remove photo" buttons.
router.delete('/avatar', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: String(req.user.id) },
      data: { avatar: null },
      select: { id: true, avatar: true, firstName: true, lastName: true, email: true }
    });
    try {
      const { writeAudit } = require('../utils/audit');
      const { broadcast } = require('../utils/events');
      const actorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      await writeAudit({
        actorId: user.id, actorName, actorRole: req.user.role || 'user',
        targetUserId: user.id, targetName: actorName,
        action: 'avatar_updated', changes: { avatar: { from: 'photo', to: '' } },
      });
      try { require('./providerRoutes').clearCache(); } catch (e) {}
      broadcast('profile_updated', { userId: user.id, changes: ['avatar'], user });
    } catch (e) {}
    res.json({ success: true, message: 'Avatar removed', data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Saved providers (server-side favorites) ----------
// Local app cache (localStorage) stays the offline source of truth;
// these endpoints sync it across devices. All return migrated:false
// until the Favorite table is migrated.
async function favTable() {
  try {
    await prisma.favorite.findFirst({ select: { id: true } });
    return true;
  } catch (e) { return false; }
}

router.get('/favorites', authMiddleware, async (req, res) => {
  if (!(await favTable())) return res.json({ success: true, migrated: false, data: [] });
  const rows = await prisma.favorite.findMany({
    where: { userId: String(req.user.id) },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, migrated: true, data: rows.map((r) => r.providerId) });
});

// Merge-replace the whole set (used by the app's sync: local ∪ server).
router.put('/favorites', authMiddleware, async (req, res) => {
  if (!(await favTable())) return res.json({ success: true, migrated: false, data: [] });
  const ids = Array.isArray(req.body.providerIds) ? req.body.providerIds.map(String).slice(0, 200) : [];
  const me = String(req.user.id);
  await prisma.favorite.deleteMany({ where: { userId: me } });
  if (ids.length) {
    await prisma.favorite.createMany({ data: ids.map((pid) => ({ userId: me, providerId: pid })), skipDuplicates: true });
  }
  res.json({ success: true, migrated: true, data: ids });
});

router.post('/favorites/:providerId', authMiddleware, async (req, res) => {
  if (!(await favTable())) return res.json({ success: true, migrated: false });
  try {
    await prisma.favorite.create({ data: { userId: String(req.user.id), providerId: String(req.params.providerId) } });
  } catch (e) { /* already saved */ }
  res.json({ success: true, migrated: true });
});

router.delete('/favorites/:providerId', authMiddleware, async (req, res) => {
  if (!(await favTable())) return res.json({ success: true, migrated: false });
  await prisma.favorite.deleteMany({ where: { userId: String(req.user.id), providerId: String(req.params.providerId) } });
  res.json({ success: true, migrated: true });
});

// Get my referral code (share it — friends get Rs 200 off their first booking)
router.get('/referral-code', authMiddleware, async (req, res) => {
  try {
    const { refCodeFor } = require('../utils/promos');
    res.json({ success: true, data: { code: refCodeFor(req.user.id) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        role: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
