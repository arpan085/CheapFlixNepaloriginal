const prisma = require('../config/database');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { bookingId, receiverId, text, attachment } = req.body;

    if (!bookingId || !receiverId || !text) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['bookingId', 'receiverId', 'text']
      });
    }

    const senderId = String(req.user.id);
    const safeBookingId = String(bookingId);
    const safeReceiverId = String(receiverId);

    // Verify booking exists and user is involved
    const booking = await prisma.booking.findUnique({
      where: { id: safeBookingId }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get provider's user ID
    const provider = await prisma.provider.findUnique({
      where: { id: booking.providerId },
      select: { userId: true }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Verify user is either customer or provider
    const isCustomer = booking.userId === senderId;
    const isProvider = provider.userId === senderId;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: 'Forbidden - not involved in this booking' });
    }

    // Verify receiver is the other party
    if ((isCustomer && safeReceiverId !== provider.userId) || 
        (isProvider && safeReceiverId !== booking.userId)) {
      return res.status(403).json({ error: 'Forbidden - invalid receiver' });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: safeReceiverId }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId: safeBookingId,
        senderId,
        receiverId: safeReceiverId,
        text: String(text),
        attachment: attachment || null
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get messages for a booking
exports.getMessages = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { bookingId } = req.params;
    const userId = String(req.user.id);
    const safeBookingId = String(bookingId);

    // Verify user is involved in booking
    const booking = await prisma.booking.findUnique({
      where: { id: safeBookingId }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get provider's user ID
    const provider = await prisma.provider.findUnique({
      where: { id: booking.providerId },
      select: { userId: true }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Verify user is either customer or provider
    const isCustomer = booking.userId === userId;
    const isProvider = provider.userId === userId;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: 'Forbidden - not involved in this booking' });
    }

    // Get all messages for this booking
    const messages = await prisma.message.findMany({
      where: { bookingId: safeBookingId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark unread messages as read for the current user
    await prisma.message.updateMany({
      where: {
        bookingId: safeBookingId,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    return res.json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Get unread message count for a user
exports.getUnreadMessageCount = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = String(req.user.id);

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    return res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

// Get conversations (unique booking-wise chat threads)
exports.getConversations = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = String(req.user.id);

    // Get all bookings involved
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId },
          { providerId: userId }
        ]
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        provider: { select: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        service: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const conversations = bookings.map(booking => {
      const lastMessage = booking.messages[0] || null;
      const otherParty = booking.userId === userId ? booking.provider.user : booking.user;

      return {
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
        otherParty,
        service: booking.service.name,
        lastMessage,
        status: booking.status
      };
    });

    return res.json({ success: true, count: conversations.length, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// Mark message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { messageId } = req.params;
    const userId = String(req.user.id);

    const message = await prisma.message.findUnique({
      where: { id: String(messageId) }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.receiverId !== userId) {
      return res.status(403).json({ error: 'Forbidden - you can only mark your own messages as read' });
    }

    const updated = await prisma.message.update({
      where: { id: String(messageId) },
      data: { isRead: true }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Mark message as read error:', error);
    return res.status(500).json({ error: 'Failed to mark message as read' });
  }
};
