const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateTicket } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/security');

// All support routes require authentication
router.use(authMiddleware);

// Create new support ticket
router.post('/', writeLimiter, validateTicket, supportController.createTicket);

// Get user's tickets
router.get('/', supportController.getUserTickets);

// Get all tickets (admin only). Keep this before /:ticketId so "admin"
// is not interpreted as a ticket id.
router.get('/admin/all', adminMiddleware, supportController.getAllTickets);

// Get single ticket
router.get('/:ticketId', supportController.getTicket);

// Add message to ticket
router.post('/:ticketId/messages', supportController.addMessage);

// Update ticket status (admin only)
router.patch('/:ticketId/status', adminMiddleware, supportController.updateTicketStatus);

module.exports = router;
