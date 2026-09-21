const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const { validateBookingCreate } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/security');

// All booking routes require authentication
router.use(authMiddleware);

// Create new booking
router.post('/', writeLimiter, validateBookingCreate, bookingController.createBooking);

// Validate a promo / referral code
router.post('/validate-promo', bookingController.validatePromoCode);

// Get user's bookings
router.get('/user/:userId', bookingController.getUserBookings);

// Get provider's bookings
router.get('/provider/:providerId', bookingController.getProviderBookings);

// Get single booking
router.get('/:bookingId', bookingController.getBooking);

// Update booking status
router.patch('/:bookingId/status', bookingController.updateBookingStatus);

// Update payment (method / status / wallet ref claim)
router.patch('/:bookingId/payment', bookingController.updatePayment);

// Verify a wallet payment reference (format check; live API later)
router.post('/:bookingId/verify-payment', bookingController.verifyPayment);

// Mark booking as completed (provider only)
router.post('/:bookingId/complete', bookingController.markCompleted);

// Cancel booking
router.post('/:bookingId/cancel', bookingController.cancelBooking);

// Reschedule booking (customer/admin)
router.patch('/:bookingId/reschedule', bookingController.rescheduleBooking);

module.exports = router;

