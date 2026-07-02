const prisma = require('../config/database');
const { logSecurityEvent } = require('../utils/securityLogger');

const DEFAULT_STATUS = 'pending';

const safeString = (value) => (value === undefined || value === null ? '' : String(value).trim());

exports.createBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      providerId,
      serviceId,
      date,
      startTime,
      duration,
      location,
      notes,
      totalAmount,
      paymentMethod
    } = req.body;

    const userId = safeString(req.user.id);
    const safeProviderId = safeString(providerId);
    const safeServiceId = safeString(serviceId);
    const safeStartTime = safeString(startTime);
    const safeDuration = safeString(duration);
    const safeLocation = safeString(location);
    const safeNotes = notes ? safeString(notes).slice(0, 500) : null;
    const safePaymentMethod = paymentMethod ? safeString(paymentMethod) : null;
    const safeAmount = Number(totalAmount);

    if (!safeProviderId || !safeServiceId || !date || !safeStartTime || !safeDuration || Number.isNaN(safeAmount) || safeAmount <= 0) {
      return res.status(400).json({ error: 'Missing or invalid booking data' });
    }

    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const provider = await prisma.provider.findUnique({ where: { id: safeProviderId } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const service = await prisma.service.findUnique({ where: { id: safeServiceId } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    if (service.providerId !== safeProviderId) {
      return res.status(400).json({ error: 'Service does not belong to provider' });
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId,
        providerId: safeProviderId,
        serviceId: safeServiceId,
        date: bookingDate,
        startTime: safeStartTime
      }
    });

    if (existingBooking) {
      logSecurityEvent('duplicate_booking_attempt', {
        userId,
        providerId: safeProviderId,
        serviceId: safeServiceId,
        date: bookingDate.toISOString(),
        startTime: safeStartTime,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(409).json({ error: 'A booking already exists for this service at the selected time.' });
    }

    let bookingRef;
    for (let i = 0; i < 5; i++) {
      bookingRef = `CF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const exists = await prisma.booking.findUnique({ where: { bookingRef } });
      if (!exists) break;
      bookingRef = null;
    }
    if (!bookingRef) bookingRef = `CF-${Date.now()}`;

    const createdBooking = await prisma.booking.create({
      data: {
        bookingRef,
        userId,
        providerId: safeProviderId,
        serviceId: safeServiceId,
        status: DEFAULT_STATUS,
        date: bookingDate,
        startTime: safeStartTime,
        duration: safeDuration,
        location: safeLocation,
        notes: safeNotes,
        totalAmount: safeAmount,
        paymentMethod: safePaymentMethod
      },
      include: {
        provider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        service: true
      }
    });

    await prisma.notification.create({
      data: {
        bookingId: createdBooking.id,
        providerId: safeProviderId,
        userId,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `New booking received for ${createdBooking.service.name}`,
        status: 'unread'
      }
    });

    return res.status(201).json({ success: true, data: createdBooking });
  } catch (error) {
    console.error('Create booking error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A duplicate booking already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create booking' });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const { userId: paramUserId } = req.params;
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const userId = String(paramUserId || req.user.id);
    if (req.user.role !== 'admin' && String(req.user.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        provider: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        service: { select: { name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error('Get user bookings error:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

exports.getProviderBookings = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const provider = await prisma.provider.findUnique({ where: { id: String(providerId) } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    if (req.user.role !== 'admin' && String(req.user.id) !== String(provider.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const bookings = await prisma.booking.findMany({
      where: { providerId: String(providerId) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        service: { select: { name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error('Get provider bookings error:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: String(bookingId) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        provider: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        service: { select: { name: true, price: true } },
        review: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role !== 'admin' && String(req.user.id) !== booking.userId && String(req.user.id) !== booking.provider.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Get booking error:', error);
    return res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) }, include: { provider: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role !== 'admin' && String(req.user.id) !== booking.provider.userId) {
      return res.status(403).json({ error: 'Only the assigned provider can update booking status' });
    }

    const updated = await prisma.booking.update({ where: { id: String(bookingId) }, data: { status } });
    return res.json({ success: true, message: 'Booking status updated', data: updated });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({ error: 'Failed to update booking' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) }, include: { provider: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isOwner = String(req.user.id) === booking.userId;
    const isProvider = String(req.user.id) === booking.provider.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot cancel this booking in its current status' });
    }

    const updated = await prisma.booking.update({
      where: { id: String(bookingId) },
      data: { status: 'cancelled', notes: reason ? safeString(reason).slice(0, 500) : 'Cancelled by user' }
    });

    return res.json({ success: true, message: 'Booking cancelled', data: updated });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Mark booking as completed (provider only)
exports.markCompleted = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const booking = await prisma.booking.findUnique({
      where: { id: String(bookingId) },
      include: {
        provider: true,
        service: { select: { name: true } }
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Only the assigned provider can mark as completed
    if (booking.provider.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the assigned provider can mark this booking as completed' });
    }

    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({ error: 'Only confirmed or in-progress bookings can be marked as completed' });
    }

    const updated = await prisma.booking.update({
      where: { id: String(bookingId) },
      data: { status: 'completed' }
    });

    // Get provider name for notification
    const providerUser = await prisma.user.findUnique({
      where: { id: booking.provider.userId },
      select: { firstName: true, lastName: true }
    });

    // Notify the customer
    await prisma.notification.create({
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
        userId: booking.userId,
        type: 'booking_completed',
        title: 'Service Completed!',
        message: `${providerUser.firstName} ${providerUser.lastName} has marked your ${booking.service.name} booking as completed. Please leave a review!`,
        status: 'unread'
      }
    });

    return res.json({ success: true, message: 'Booking marked as completed', data: updated });
  } catch (error) {
    console.error('Mark completed error:', error);
    return res.status(500).json({ error: 'Failed to mark booking as completed' });
  }
};
