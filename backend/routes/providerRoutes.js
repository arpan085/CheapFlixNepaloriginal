const express = require('express');
const router = express.Router();
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const prisma = require('../config/database');

// Get all providers (public endpoint)
router.get('/', async (req, res) => {
  try {
    // First, fetch all providers with their services
    const providers = await prisma.provider.findMany({
      where: { verified: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        services: true
      },
      orderBy: { rating: 'desc' }
    });

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

    res.json({ success: true, count: providers.length, data: providers });
  } catch (err) {
    console.error('Get all providers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create/update provider profile (provider only)
router.put('/profile', authMiddleware, providerMiddleware, async (req, res) => {
  try {
    const { category, bio, experience } = req.body;
    
    // Find provider by userId
    const provider = await prisma.provider.findUnique({
      where: { userId: String(req.user.id) }
    });
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }
    
    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        category: category || undefined,
        bio: bio || undefined,
        experience: experience || undefined
      },
      include: { user: true, services: true }
    });
    
    res.json({ success: true, message: 'Provider profile updated', data: updated });
  } catch (err) {
    console.error('Update provider profile error:', err);
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
            user: { select: { firstName: true, lastName: true } }
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
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        services: true,
        bookings: { where: { status: 'completed' }, select: { id: true } }
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
