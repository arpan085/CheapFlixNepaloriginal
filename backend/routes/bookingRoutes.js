const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const bookingCreateRules = [
  body('providerId').trim().notEmpty().withMessage('providerId is required'),
  body('serviceId').trim().notEmpty().withMessage('serviceId is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').trim().notEmpty().withMessage('startTime is required'),
  body('duration').trim().notEmpty().withMessage('duration is required'),
  body('totalAmount').isFloat({ gt: 0 }).withMessage('totalAmount must be a positive number')
];

const bookingIdRules = [
  param('bookingId').trim().notEmpty().withMessage('Booking ID is required')
];

const userIdRules = [
  param('userId').trim().notEmpty().withMessage('User ID is required')
];

const providerIdRules = [
  param('providerId').trim().notEmpty().withMessage('Provider ID is required')
];

router.use(authMiddleware);

router.post('/', bookingCreateRules, handleValidationErrors, bookingController.createBooking);
router.get('/user/:userId', userIdRules, handleValidationErrors, bookingController.getUserBookings);
router.get('/provider/:providerId', providerIdRules, handleValidationErrors, bookingController.getProviderBookings);
router.get('/:bookingId', bookingIdRules, handleValidationErrors, bookingController.getBooking);
router.patch('/:bookingId/status', bookingIdRules, handleValidationErrors, providerMiddleware, bookingController.updateBookingStatus);
router.post('/:bookingId/complete', bookingIdRules, handleValidationErrors, providerMiddleware, bookingController.markCompleted);
router.post('/:bookingId/cancel', bookingIdRules, handleValidationErrors, bookingController.cancelBooking);

module.exports = router;

