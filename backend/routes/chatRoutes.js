const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');

// All chat routes require authentication
router.use(authMiddleware);

// Send message
router.post('/send', chatController.sendMessage);

// Get messages for a booking
router.get('/booking/:bookingId', chatController.getMessages);

// Get all conversations (chat threads)
router.get('/', chatController.getConversations);

// Get unread message count
router.get('/unread/count', chatController.getUnreadMessageCount);

// Mark message as read
router.patch('/:messageId/read', chatController.markMessageAsRead);

module.exports = router;
