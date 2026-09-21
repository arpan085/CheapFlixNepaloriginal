const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const prisma = require('../config/database');

// protect all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// dashboard
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// users
router.get('/users', adminController.getUsers);
router.delete('/users/:id', adminController.deleteUser);

// providers
router.get('/providers', adminController.getProviders);
router.patch('/providers/:id/verify', adminController.verifyProvider);
router.post('/providers/:id/suspend', adminController.suspendProvider);
router.delete('/providers/:id', adminController.deleteProvider);

// bookings
router.get('/bookings', adminController.getBookings);
router.patch('/bookings/:id/cancel', adminController.cancelBooking);

// categories (rename / merge trades)
router.get('/categories', adminController.getCategories);
router.patch('/categories', adminController.renameCategory);

// reviews (moderation)
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        provider: { include: { user: { select: { firstName: true, lastName: true } } } },
        booking: { select: { bookingRef: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: String(req.params.id) } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await prisma.review.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true, message: 'Review removed by admin.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// promos (coupon codes: pct or flat, optional caps/expiry/usage limits)
function promoInput(body, partial) {
  const out = {};
  const set = (k, v) => { if (v !== undefined) out[k] = v; };
  if (!partial || body.code !== undefined) {
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,16}$/.test(code)) throw new Error('Code must be 3–16 chars (A–Z, 0–9, -).');
    out.code = code;
  }
  if (!partial || body.label !== undefined) {
    const label = String(body.label || '').trim().slice(0, 120);
    if (!label) throw new Error('Label is required.');
    out.label = label;
  }
  if (!partial || body.type !== undefined) {
    if (!['pct', 'flat'].includes(String(body.type))) throw new Error('Type must be pct or flat.');
    out.type = String(body.type);
  }
  if (!partial || body.value !== undefined) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v <= 0) throw new Error('Value must be positive.');
    set('value', v);
  }
  if (body.maxOff !== undefined && body.maxOff !== null && body.maxOff !== '') {
    const m = Number(body.maxOff);
    if (!Number.isFinite(m) || m < 0) throw new Error('maxOff looks invalid.');
    out.maxOff = m;
  } else if (!partial) out.maxOff = null;
  if (body.minTotal !== undefined) out.minTotal = Math.max(0, Number(body.minTotal) || 0);
  if (body.firstBookingOnly !== undefined) out.firstBookingOnly = Boolean(body.firstBookingOnly);
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (body.expiresAt !== undefined) {
    out.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (out.expiresAt && Number.isNaN(out.expiresAt.getTime())) throw new Error('Invalid expiry date.');
  }
  if (body.usageLimit !== undefined) {
    out.usageLimit = body.usageLimit === null || body.usageLimit === '' ? null : parseInt(body.usageLimit, 10);
    if (out.usageLimit !== null && (!Number.isInteger(out.usageLimit) || out.usageLimit < 1)) throw new Error('usageLimit must be a positive integer.');
  }
  return out;
}

router.get('/promos', async (req, res) => {
  try {
    const rows = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Promo table not migrated yet — run database migrations.' });
  }
});
router.post('/promos', async (req, res) => {
  try {
    const data = promoInput(req.body, false);
    const row = await prisma.promoCode.create({ data });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create promo' });
  }
});
router.patch('/promos/:id', async (req, res) => {
  try {
    const data = promoInput(req.body, true);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' });
    const row = await prisma.promoCode.update({ where: { id: String(req.params.id) }, data });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not update promo' });
  }
});
router.delete('/promos/:id', async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true, message: 'Promo deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Promo not found' });
  }
});

// services
router.get('/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ 
      success: true,
      count: services.length,
      data: services 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;