const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/security');

router.use(authMiddleware);

// Wallet flows (customer-heavy, rate-limited)
router.post('/initiate', writeLimiter, paymentController.initiate);
router.post('/verify', writeLimiter, paymentController.verify);
router.get('/booking/:bookingId', paymentController.history);
router.post('/:bookingId/refund-request', writeLimiter, paymentController.refundRequest);
router.post('/:bookingId/refund-approve', paymentController.refundApprove);

// Availability — read is public-ish (any logged-in user booking a pro needs it)
router.get('/availability/:providerId', paymentController.getAvailability);
router.put('/availability', providerMiddleware, paymentController.setAvailability);
router.delete('/availability/:date', providerMiddleware, paymentController.clearDayOff);

module.exports = router;
