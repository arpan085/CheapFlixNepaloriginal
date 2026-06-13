const prisma = require('../config/database');

// Get all notifications for a user (provider)
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.user || req.user.id !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Find provider(s) for this user
    const providers = await prisma.provider.findMany({
      where: { userId: String(userId) },
      select: { id: true }
    });

    if (!providers.length) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const providerIds = providers.map(p => p.id);

    const notifications = await prisma.notification.findMany({
      where: {
        providerId: { in: providerIds }
      },
      include: {
        booking: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            provider: { select: { id: true } },
            service: { select: { name: true, price: true } }
          }
        },
        user: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Get single notification
exports.getNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: String(notificationId) },
      include: {
        booking: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
            provider: { select: { id: true } },
            service: { select: { name: true, price: true } }
          }
        }
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as read
    if (notification.status === 'unread') {
      await prisma.notification.update({
        where: { id: String(notificationId) },
        data: { status: 'read' }
      });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
};

// Accept booking request
exports.acceptBooking = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Get notification
    const notification = await prisma.notification.findUnique({
      where: { id: String(notificationId) },
      include: { booking: true }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify authorization
    const provider = await prisma.provider.findUnique({
      where: { id: notification.providerId }
    });

    if (provider.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: notification.bookingId },
      data: { status: 'confirmed' }
    });

    // Update notification
    await prisma.notification.update({
      where: { id: String(notificationId) },
      data: {
        status: 'read',
        action: 'accept',
        actionDate: new Date()
      }
    });

    // Create confirmation notification for customer
    const providerUser = await prisma.user.findUnique({
      where: { id: provider.userId },
      select: { firstName: true, lastName: true }
    });

    await prisma.notification.create({
      data: {
        bookingId: notification.bookingId,
        providerId: notification.providerId,
        userId: notification.userId,
        type: 'booking_accepted',
        title: 'Booking Accepted!',
        message: `${providerUser.firstName} ${providerUser.lastName} has accepted your booking request.`,
        status: 'unread'
      }
    });

    res.json({
      success: true,
      message: 'Booking accepted successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error accepting booking:', error);
    res.status(500).json({ error: 'Failed to accept booking' });
  }
};

// Reject booking request
exports.rejectBooking = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { reason } = req.body;

    // Get notification
    const notification = await prisma.notification.findUnique({
      where: { id: String(notificationId) },
      include: { booking: true }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify authorization
    const provider = await prisma.provider.findUnique({
      where: { id: notification.providerId }
    });

    if (provider.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: notification.bookingId },
      data: {
        status: 'cancelled',
        notes: reason || 'Booking rejected by provider'
      }
    });

    // Update notification
    await prisma.notification.update({
      where: { id: String(notificationId) },
      data: {
        status: 'read',
        action: 'reject',
        actionDate: new Date()
      }
    });

    // Create rejection notification for customer
    const providerUser = await prisma.user.findUnique({
      where: { id: provider.userId },
      select: { firstName: true, lastName: true }
    });

    await prisma.notification.create({
      data: {
        bookingId: notification.bookingId,
        providerId: notification.providerId,
        userId: notification.userId,
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `${providerUser.firstName} ${providerUser.lastName} has rejected your booking request.${reason ? ` Reason: ${reason}` : ''}`,
        status: 'unread'
      }
    });

    res.json({
      success: true,
      message: 'Booking rejected successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ error: 'Failed to reject booking' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.update({
      where: { id: String(notificationId) },
      data: { status: 'read' }
    });

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Get unread notifications count
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.user || req.user.id !== String(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Find provider(s) for this user
    const providers = await prisma.provider.findMany({
      where: { userId: String(userId) },
      select: { id: true }
    });

    if (!providers.length) {
      return res.json({ success: true, unreadCount: 0 });
    }

    const providerIds = providers.map(p => p.id);

    const unreadCount = await prisma.notification.count({
      where: {
        AND: [
          { status: 'unread' },
          { providerId: { in: providerIds } }
        ]
      }
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};
