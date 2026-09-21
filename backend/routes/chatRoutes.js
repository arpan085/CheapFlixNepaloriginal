const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');
const { validateChatSend } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/security');

// All chat routes require authentication
router.use(authMiddleware);

// Send message
router.post('/send', writeLimiter, validateChatSend, chatController.sendMessage);

// Upload a chat attachment (image/PDF, max 5MB). Returns { url } —
// pass it as `attachment` in POST /send.
router.post('/attachment', writeLimiter, (req, res, next) => {
  const { chatUpload, storeFile } = require('../middleware/upload');
  chatUpload(req, res, async (err) => {
    if (err || !req.file) return res.status(400).json({ error: (err && err.message) || 'Attach a file as "file".' });
    try {
      const url = await storeFile(req, 'chat', req.file);
      res.json({ success: true, url, name: req.file.originalname });
    } catch (e) {
      res.status(500).json({ error: 'Upload failed' });
    }
  });
});

// Get messages for a booking
router.get('/booking/:bookingId', chatController.getMessages);

// Get all conversations (chat threads)
router.get('/', chatController.getConversations);

// Get unread message count
router.get('/unread/count', chatController.getUnreadMessageCount);

// Mark message as read
router.patch('/:messageId/read', chatController.markMessageAsRead);

module.exports = router;
