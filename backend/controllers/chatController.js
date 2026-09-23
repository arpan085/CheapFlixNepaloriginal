const prisma = require('../config/database');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { bookingId, receiverId, text, attachment } = req.body;

    if (!bookingId || !receiverId || (!text && !attachment)) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['bookingId', 'receiverId', 'text or attachment']
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

    // Chat unlocks only after the provider accepts the request —
    // customers apply first, the two sides connect on confirmation.
    if (String(booking.status).toLowerCase() === 'pending') {
      return res.status(403).json({ error: 'Chat unlocks after the provider accepts your request.' });
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
        text: String(text || (attachment ? '[attachment]' : '')),
        attachment: attachment || null
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    try {
      require('../utils/events').emitTo(safeReceiverId, 'chat', {
        bookingId: safeBookingId, messageId: message.id,
        from: (message.sender.firstName || '') + ' ' + (message.sender.lastName || ''),
        text: message.text,
      });
    } catch (e) {}

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

    // Paginated: ?limit= (default 50, max 100) + ?before= (message id cursor).
    // Returns the latest N messages in chronological order + hasMore flag.
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const beforeId = req.query.before ? String(req.query.before) : null;
    let cursorFilter = {};
    if (beforeId) {
      const anchor = await prisma.message.findUnique({
        where: { id: beforeId },
        select: { createdAt: true, bookingId: true },
      });
      if (anchor && anchor.bookingId === safeBookingId) {
        cursorFilter = { createdAt: { lt: anchor.createdAt } };
      }
    }

    // Newest-first, then reverse so the client still gets chronological order.
    const messages = await prisma.message.findMany({
      where: { bookingId: safeBookingId, ...cursorFilter },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit).reverse();

    // Mark unread messages as read for the current user
    await prisma.message.updateMany({
      where: {
        bookingId: safeBookingId,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    return res.json({ success: true, count: page.length, hasMore, data: page });
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

    // Provider ids owned by this user (providers chat via their provider record)
    const myProviders = await prisma.provider.findMany({
      where: { userId },
      select: { id: true }
    });
    const myProviderIds = myProviders.map((p) => p.id);

    // Paginated: ?page=1&limit=20 (max 50) — keeps polling cheap.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    // Get all bookings involved (as customer OR as provider)
    const or = [{ userId }];
    if (myProviderIds.length) or.push({ providerId: { in: myProviderIds } });
    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: { OR: or } }),
      prisma.booking.findMany({
      where: { OR: or },
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
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      }),
    ]);

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

    return res.json({ success: true, count: conversations.length, total, page, totalPages: Math.ceil(total / limit), data: conversations });
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
