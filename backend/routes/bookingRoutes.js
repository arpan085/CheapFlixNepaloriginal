const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');

// All booking routes require authentication
router.use(authMiddleware);

// Create new booking
router.post('/', bookingController.createBooking);

// Get user's bookings
router.get('/user/:userId', bookingController.getUserBookings);

// Get provider's bookings
router.get('/provider/:providerId', bookingController.getProviderBookings);

// Get single booking
router.get('/:bookingId', bookingController.getBooking);

// Update booking status
router.patch('/:bookingId/status', bookingController.updateBookingStatus);

// Mark booking as completed (provider only)
router.post('/:bookingId/complete', bookingController.markCompleted);

// Cancel booking
router.post('/:bookingId/cancel', bookingController.cancelBooking);

module.exports = router;

