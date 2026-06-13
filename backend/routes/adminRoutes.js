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