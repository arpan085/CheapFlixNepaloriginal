const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/security');

// Availability is public so customers can see real slots before signing in.
router.get('/availability/:providerId', paymentController.getAvailability);

router.use(authMiddleware);

// Wallet flows (customer-heavy, rate-limited)
router.post('/initiate', writeLimiter, paymentController.initiate);
router.post('/verify', writeLimiter, paymentController.verify);
router.get('/booking/:bookingId', paymentController.history);
router.post('/:bookingId/refund-request', writeLimiter, paymentController.refundRequest);
router.post('/:bookingId/refund-approve', paymentController.refundApprove);

router.put('/availability', providerMiddleware, paymentController.setAvailability);
router.delete('/availability/:date', providerMiddleware, paymentController.clearDayOff);

module.exports = router;
