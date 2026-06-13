const prisma = require('../config/database');

const DEFAULT_STATUS = 'pending';

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

    if (!providerId || !serviceId || !date || !startTime || !duration || totalAmount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['providerId', 'serviceId', 'date', 'startTime', 'duration', 'totalAmount']
      });
    }

    const userId = String(req.user.id);
    const safeProviderId = String(providerId);
    const safeServiceId = String(serviceId);
    const safeAmount = Number(totalAmount);
    const safeDuration = String(duration);

    if (Number.isNaN(safeAmount)) {
      return res.status(400).json({ error: 'Invalid totalAmount' });
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

    let bookingRef;
    for (let i = 0; i < 5; i++) {
      bookingRef = `CF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const exists = await prisma.booking.findUnique({ where: { bookingRef } });
      if (!exists) break;
      bookingRef = null;
    }
    if (!bookingRef) bookingRef = `CF-${Date.now()}`;

    const [createdBooking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          bookingRef,
          userId,
          providerId: safeProviderId,
          serviceId: safeServiceId,
          status: DEFAULT_STATUS,
          date: bookingDate,
          startTime: String(startTime),
          duration: safeDuration,
          location: location || '',
          notes: notes || null,
          totalAmount: safeAmount,
          paymentMethod: paymentMethod || null
        },
        include: {
          provider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          service: true
        }
      }),
      // notification will be created in a separate step below within the transaction array
    ]);

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
    return res.status(500).json({ error: 'Failed to create booking', details: error.message });
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
        user: { select: { firstName: true, lastName: true, phone: true, email: true } },
        provider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        service: { select: { name: true, price: true } },
        review: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
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

    const booking = await prisma.booking.update({ where: { id: String(bookingId) }, data: { status } });
    return res.json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({ error: 'Failed to update booking' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot cancel this booking in its current status' });
    }

    const updated = await prisma.booking.update({
      where: { id: String(bookingId) },
      data: { status: 'cancelled', notes: reason || 'Cancelled by user' }
    });

    return res.json({ success: true, message: 'Booking cancelled', data: updated });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
};
