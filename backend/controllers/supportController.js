const prisma = require('../config/database');

// Create a new support ticket
exports.createTicket = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description', 'category']
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        title,
        description,
        category,
        priority: priority || 'medium',
        status: 'open'
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: true
      }
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket', details: error.message });
  }
};

// Get all tickets for a user
exports.getUserTickets = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: {
          include: {
            sender: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

// Get single ticket by ID
exports.getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          include: {
            sender: { select: { firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== ticket.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

// Add message to ticket
exports.addMessage = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== ticket.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: req.user.id,
        message
      },
      include: {
        sender: { select: { firstName: true, lastName: true } }
      }
    });

    res.status(201).json({ success: true, data: ticketMessage });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
};

// Update ticket status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Only admin can update status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update ticket status' });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: status === 'resolved' ? new Date() : null
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        messages: true
      }
    });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

// Get all tickets (admin only)
exports.getAllTickets = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: { include: { sender: { select: { firstName: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};
