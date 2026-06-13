const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, providerMiddleware } = require('../middleware/auth');

// All notification routes require authentication
router.use(authMiddleware);

// Get all notifications for a provider
router.get('/user/:userId', notificationController.getNotifications);

// Get unread count
router.get('/unread/:userId', notificationController.getUnreadCount);

// Get single notification
router.get('/:notificationId', notificationController.getNotification);

// Mark as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Accept booking request (provider only)
router.post('/:notificationId/accept', providerMiddleware, notificationController.acceptBooking);

// Reject booking request (provider only)
router.post('/:notificationId/reject', providerMiddleware, notificationController.rejectBooking);

module.exports = router;
