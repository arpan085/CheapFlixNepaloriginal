const express = require('express');
const router = express.Router();
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const { kycUpload, storeFile } = require('../middleware/upload');
const prisma = require('../config/database');

// Public provider cards are read-heavy. Keep a tiny process-local cache so
// booking/search screens do not repeat the same database round-trip.
// The cache is cleared on EVERY profile/user/provider write below so
// edits are visible to everyone immediately (no stale cards).
const publicProviderCache = new Map();
const PROVIDER_CACHE_MS = 15000;
function clearPublicProviderCache() { publicProviderCache.clear(); }

// Get all providers (public).
// Query: ?page=1&limit=20&q=electrician&category=Plumber&city=Pokhara&minRating=4.7&sort=rating|exp|priceLow|priceHigh
router.get('/', async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    const cached = publicProviderCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return res.json(cached.payload);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const city = String(req.query.city || '').trim();
    const minRating = Number(req.query.minRating) || 0;
    const sort = String(req.query.sort || 'rating');
    const where = { verified: true };
    if (category && category.toLowerCase() !== 'all') where.category = { contains: category, mode: 'insensitive' };
    if (minRating > 0) where.rating = { gte: minRating };
    if (city && city.toLowerCase() !== 'all') where.user = { city };
    if (q) {
      where.OR = [
        { category: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { services: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    const priceSort = sort === 'priceLow' || sort === 'priceHigh';
    const orderBy = sort === 'exp' ? { experience: 'desc' } : { rating: 'desc' };
    const userSel = { select: { id: true, firstName: true, lastName: true, city: true, avatar: true } };
    const serviceSel = { select: { id: true, providerId: true, name: true, description: true, price: true, duration: true } };
    let total, providers;
    if (priceSort) {
      // Price lives on services — fetch the filtered set (cap 500), sort, slice.
      const all = await prisma.provider.findMany({
        where, include: { user: userSel, services: serviceSel }, orderBy,
        take: 500,
      });
      const price = (p) => Number((p.services && p.services[0] && p.services[0].price) || Infinity);
      all.sort((a, b) => (sort === 'priceLow' ? price(a) - price(b) : price(b) - price(a)));
      total = all.length;
      providers = all.slice((page - 1) * limit, page * limit);
    } else {
      [total, providers] = await Promise.all([
        prisma.provider.count({ where }),
        prisma.provider.findMany({
          where,
          include: { user: userSel, services: serviceSel },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
    }

    // Do not create data during a public read. Registration/onboarding owns
    // service creation; empty service lists remain honest and fast.

    const payload = { success: true, count: providers.length, total, page, totalPages: Math.ceil(total / limit), data: providers };
    publicProviderCache.set(cacheKey, { expiresAt: Date.now() + PROVIDER_CACHE_MS, payload });
    if (publicProviderCache.size > 100) {
      for (const [key, value] of publicProviderCache) {
        if (value.expiresAt <= Date.now()) publicProviderCache.delete(key);
      }
    }
    res.json(payload);
  } catch (err) {
    console.error('Get all providers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update provider profile (provider only) — bio, trade, experience,
// city/phone/name (saved on user), starting price (saved on first service)
router.put('/profile', authMiddleware, providerMiddleware, async (req, res) => {
  try {
    const { category, bio, experience, city, phone, price, address, serviceName, duration, firstName, lastName } = req.body;

    const provider = await prisma.provider.findUnique({
      where: { userId: String(req.user.id) },
      include: { services: true, user: { select: { firstName: true, lastName: true, phone: true, city: true, address: true } } }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    const expNum = experience === undefined || experience === '' ? undefined : parseInt(experience, 10);
    const priceNum = price === undefined || price === '' ? undefined : Number(price);
    const durationNum = duration === undefined || duration === '' ? undefined : parseInt(duration, 10);
    if (bio !== undefined && String(bio).length > 1000) return res.status(400).json({ error: 'Bio must be 1000 characters or fewer.' });
    if (priceNum !== undefined && (!Number.isFinite(priceNum) || priceNum < 0 || priceNum > 1000000)) return res.status(400).json({ error: 'Price looks invalid.' });
    if (durationNum !== undefined && (!Number.isInteger(durationNum) || durationNum < 15 || durationNum > 1440)) return res.status(400).json({ error: 'Duration must be between 15 and 1440 minutes.' });

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        category: category || undefined,
        bio: bio || undefined,
        experience: Number.isFinite(expNum) ? expNum : undefined
      },
      include: { user: true, services: true }
    });

    // Keep user contact/location/name in sync (firstName/lastName were
    // previously ignored — provider renames never saved).
    const userData = {};
    if (phone) userData.phone = String(phone);
    if (city) userData.city = String(city);
    if (address) userData.address = String(address);
    if (firstName) userData.firstName = String(firstName).slice(0, 80);
    if (lastName) userData.lastName = String(lastName).slice(0, 80);
    let freshUser = updated.user;
    if (Object.keys(userData).length) {
      freshUser = await prisma.user.update({ where: { id: String(req.user.id) }, data: userData });
    }

    // Keep a starting price: update first service or create one
    if (priceNum !== undefined && Number.isFinite(priceNum) && priceNum >= 0) {
      if (updated.services && updated.services.length) {
        await prisma.service.update({
          where: { id: updated.services[0].id },
          data: { price: priceNum, name: serviceName ? String(serviceName).trim().slice(0, 80) : undefined, duration: durationNum || undefined }
        });
      } else {
        await prisma.service.create({
          data: {
            providerId: provider.id,
            name: serviceName ? String(serviceName).trim().slice(0, 80) : `${updated.category || category || 'General'} Services`,
            description: updated.bio || bio || null,
            price: priceNum,
            duration: durationNum || 60
          }
        });
      }
    }

    const fresh = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true, address: true, avatar: true } },
        services: true
      }
    });

    // Audit + instant fan-out: clear the public list cache and broadcast
    // so cards, detail pages, bookings and the admin panel update live.
    try {
      const { diffFields, writeAudit } = require('../utils/audit');
      const { broadcast } = require('../utils/events');
      const beforeUser = (provider.user || {});
      const afterUser = (fresh && fresh.user) || freshUser || {};
      const userChanges = diffFields(beforeUser, afterUser, ['firstName', 'lastName', 'phone', 'city', 'address']);
      const provChanges = diffFields(provider, updated, ['category', 'bio', 'experience']);
      const changes = { ...userChanges };
      for (const k of Object.keys(provChanges)) changes['provider.' + k] = provChanges[k];
      if (priceNum !== undefined && Number.isFinite(priceNum)) changes.price = { from: '', to: String(priceNum) };
      const actorName = [afterUser.firstName, afterUser.lastName].filter(Boolean).join(' ') || afterUser.email || 'Provider';
      await writeAudit({
        actorId: String(req.user.id), actorName, actorRole: 'provider',
        targetUserId: String(req.user.id), targetName: actorName,
        action: 'provider_profile_updated', changes,
      });
      clearPublicProviderCache();
      broadcast('profile_updated', {
        userId: String(req.user.id), providerId: provider.id,
        changes: Object.keys(changes), provider: fresh, user: afterUser,
      });
    } catch (e) { try { clearPublicProviderCache(); } catch (e2) {} }

    res.json({ success: true, message: 'Provider profile updated', data: fresh });
  } catch (err) {
    console.error('Update provider profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Provider's own profile, including pending profiles that are not public yet.
router.get('/me', authMiddleware, providerMiddleware, async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: String(req.user.id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true, address: true, avatar: true } },
        services: true,
        reviews: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });
    res.json({ success: true, data: provider });
  } catch (err) {
    res.status(500).json({ error: 'Could not load provider profile' });
  }
});

// Upload KYC documents (provider only). Up to 3 images/PDF, max 5MB each.
// Stored as a JSON array on Provider.documents; admin verifies in dashboard.
router.post('/documents', authMiddleware, providerMiddleware, kycUpload, async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: 'Attach up to 3 files as "documents".' });
    }
    const provider = await prisma.provider.findUnique({ where: { userId: String(req.user.id) } });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

    let existing = [];
    try { existing = JSON.parse(provider.documents || '[]'); } catch (e) { existing = []; }
    const urls = await Promise.all(req.files.map((f) => storeFile(req, 'kyc', f)));
    const merged = [...existing, ...urls].slice(-9); // keep the latest 9

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: { documents: JSON.stringify(merged) },
      select: { id: true, verified: true, documents: true }
    });
    res.json({ success: true, message: 'Documents uploaded. Verification usually takes 1–2 working days.', data: { documents: merged, verified: updated.verified } });
  } catch (err) {
    console.error('Upload KYC error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all services (public) - MUST BE BEFORE /:id route
router.get('/services/all', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: services.length, data: services });
  } catch (err) {
    console.error('Get all services error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get provider details by ID (public endpoint) - MUST BE LAST
router.get('/:id', async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: String(req.params.id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true, address: true, avatar: true } },
        services: true,
        bookings: { where: { status: 'completed' }, select: { id: true } },
        reviews: {
          include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json({ success: true, data: provider });
  } catch (err) {
    console.error('Get provider details error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.clearCache = clearPublicProviderCache;
