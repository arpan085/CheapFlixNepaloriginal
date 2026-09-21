const express = require('express');
const router = express.Router();
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const { kycUpload, storeFile } = require('../middleware/upload');
const prisma = require('../config/database');

// Get all providers (public).
// Query: ?page=1&limit=20&q=electrician&category=Plumber&city=Pokhara&minRating=4.7&sort=rating|exp|priceLow|priceHigh
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const city = String(req.query.city || '').trim();
    const minRating = Number(req.query.minRating) || 0;
    const sort = String(req.query.sort || 'rating');
    const where = { verified: true };
    if (category && category.toLowerCase() !== 'all') where.category = { contains: category };
    if (minRating > 0) where.rating = { gte: minRating };
    if (city && city.toLowerCase() !== 'all') where.user = { city };
    if (q) {
      where.OR = [
        { category: { contains: q } },
        { bio: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { services: { some: { name: { contains: q } } } },
      ];
    }
    const priceSort = sort === 'priceLow' || sort === 'priceHigh';
    const orderBy = sort === 'exp' ? { experience: 'desc' } : { rating: 'desc' };
    const userSel = { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true } };
    let total, providers;
    if (priceSort) {
      // Price lives on services — fetch the filtered set (cap 500), sort, slice.
      const all = await prisma.provider.findMany({
        where, include: { user: userSel, services: true }, orderBy,
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
          include: { user: userSel, services: true },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
    }

    // Ensure each provider has at least one service
    for (const provider of providers) {
      if (!provider.services || provider.services.length === 0) {
        // Create a default service for this provider
        await prisma.service.create({
          data: {
            providerId: provider.id,
            name: `${provider.category} Services`,
            description: provider.bio || `Professional ${provider.category} services`,
            price: 500, // Default price
            duration: 60
          }
        });
        
        // Add the created service to the provider object
        provider.services = [
          {
            name: `${provider.category} Services`,
            description: provider.bio || `Professional ${provider.category} services`,
            price: 500,
            duration: 60
          }
        ];
      }
    }

    res.json({ success: true, count: providers.length, total, page, totalPages: Math.ceil(total / limit), data: providers });
  } catch (err) {
    console.error('Get all providers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update provider profile (provider only) — bio, trade, experience,
// city/phone (saved on user), starting price (saved on first service)
router.put('/profile', authMiddleware, providerMiddleware, async (req, res) => {
  try {
    const { category, bio, experience, city, phone, price, address } = req.body;

    const provider = await prisma.provider.findUnique({
      where: { userId: String(req.user.id) },
      include: { services: true }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    const expNum = experience === undefined || experience === '' ? undefined : parseInt(experience, 10);
    const priceNum = price === undefined || price === '' ? undefined : Number(price);

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        category: category || undefined,
        bio: bio || undefined,
        experience: Number.isFinite(expNum) ? expNum : undefined
      },
      include: { user: true, services: true }
    });

    // Keep user contact/location in sync
    const userData = {};
    if (phone) userData.phone = String(phone);
    if (city) userData.city = String(city);
    if (address) userData.address = String(address);
    if (Object.keys(userData).length) {
      await prisma.user.update({ where: { id: String(req.user.id) }, data: userData });
    }

    // Keep a starting price: update first service or create one
    if (priceNum !== undefined && Number.isFinite(priceNum) && priceNum >= 0) {
      if (updated.services && updated.services.length) {
        await prisma.service.update({
          where: { id: updated.services[0].id },
          data: { price: priceNum }
        });
      } else {
        await prisma.service.create({
          data: {
            providerId: provider.id,
            name: `${updated.category || category || 'General'} Services`,
            description: updated.bio || bio || null,
            price: priceNum,
            duration: 60
          }
        });
      }
    }

    const fresh = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true, address: true } },
        services: true
      }
    });

    res.json({ success: true, message: 'Provider profile updated', data: fresh });
  } catch (err) {
    console.error('Update provider profile error:', err);
    res.status(500).json({ error: err.message });
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
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true, address: true } },
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
