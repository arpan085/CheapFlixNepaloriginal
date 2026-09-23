const prisma = require('../config/database');
const { expectedTotal, validatePromo, recordPromoUse } = require('../utils/promos');

const DEFAULT_STATUS = 'pending';

// Check a promo/referral code without booking (shows discount + total).
exports.validatePromoCode = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Authentication required' });
    const { code, subtotal } = req.body;
    const r = await validatePromo(prisma, { code, userId: req.user.id, subtotal });
    if (!r.ok) return res.status(400).json({ error: r.reason });
    return res.json({ success: true, data: { code: r.promo.code, label: r.promo.label, discount: r.discount, total: Math.max(0, (Number(subtotal) || 0) - r.discount) } });
  } catch (error) {
    console.error('Validate promo error:', error);
    return res.status(500).json({ error: 'Could not validate the code' });
  }
};

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
      paymentMethod,
      promoCode
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

    // Availability: paused providers, weekly offs and blocked days/slots.
    if (provider.isAvailable === false) {
      return res.status(409).json({ error: 'This provider is paused right now. Try another pro or a later date.' });
    }
    try {
      const dayStart = new Date(bookingDate);
      dayStart.setHours(0, 0, 0, 0);
      let weeklyOff = [];
      try { weeklyOff = JSON.parse(provider.weeklyOff || '[]'); } catch (e) { weeklyOff = []; }
      if (weeklyOff.includes(bookingDate.getDay())) {
        return res.status(409).json({ error: 'Provider is off on this weekday. Pick another day.' });
      }
      let off = null;
      try {
        off = await prisma.providerDayOff.findUnique({
          where: { providerId_date: { providerId: safeProviderId, date: dayStart } },
        });
      } catch (e) { off = null; /* table not migrated yet */ }
      if (off) {
        let slots = [];
        try { slots = JSON.parse(off.slots || '[]'); } catch (e) { slots = []; }
        if (!slots.length || slots.includes(String(startTime))) {
          return res.status(409).json({ error: 'Provider blocked this time. Pick another slot.' });
        }
      }
    } catch (e) { console.error('availability check error:', e.message); }

    // Double-booking guard: same provider + date + slot still open.
    const clash = await prisma.booking.findFirst({
      where: {
        providerId: safeProviderId,
        date: bookingDate,
        startTime: String(startTime),
        status: { in: ['pending', 'confirmed', 'in_progress'] },
      },
      select: { id: true, bookingRef: true },
    });
    if (clash) {
      return res.status(409).json({ error: 'That slot was just taken. Pick another time.' });
    }

    const service = await prisma.service.findUnique({ where: { id: safeServiceId } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    if (service.providerId !== safeProviderId) {
      return res.status(400).json({ error: 'Service does not belong to provider' });
    }

    // Server-side price check: recompute the estimate and enforce promos.
    // (Clients used to send any totalAmount — now the server is authoritative.)
    const expected = expectedTotal(service.price, safeDuration);
    if (expected === null) return res.status(400).json({ error: 'Invalid duration for pricing.' });
    let finalTotal = expected;
    let promoApplied = null;
    let referrerId = null;
    if (promoCode) {
      const r = await validatePromo(prisma, { code: promoCode, userId, subtotal: expected });
      if (!r.ok) return res.status(400).json({ error: r.reason });
      finalTotal = Math.max(0, expected - r.discount);
      promoApplied = r.promo.code;
      referrerId = r.referrerId || null;
    }
    if (Math.abs(safeAmount - finalTotal) > 2) {
      return res.status(400).json({ error: 'Total mismatch — refresh the estimate and try again.' });
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
          totalAmount: finalTotal,
          paymentMethod: paymentMethod || null
        },
        include: {
          provider: { include: { user: { select: { firstName: true, lastName: true, avatar: true, phone: true } } } },
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
        message: `New booking received for ${createdBooking.service.name}` + (promoApplied ? ` (promo ${promoApplied} applied)` : ''),
        status: 'unread'
      }
    });

    if (promoApplied) await recordPromoUse(prisma, promoApplied);
    try {
      const provUser = await prisma.provider.findUnique({ where: { id: safeProviderId }, select: { userId: true } });
      if (provUser) require('../utils/events').emitTo(provUser.userId, 'booking', { type: 'booking_request', bookingId: createdBooking.id, ref: bookingRef });
      // Email (+ opt-in SMS) to the provider — in-app notification already sent above.
      const [cust, pUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, firstName: true, lastName: true } }),
        provUser ? prisma.user.findUnique({ where: { id: provUser.userId }, select: { email: true, phone: true, firstName: true, lastName: true } }) : null,
      ]);
      await require('../utils/notify').bookingFanout('booking_request', createdBooking, { customer: cust || {}, provider: pUser || {} });
    } catch (e) {}

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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: { userId } }),
      prisma.booking.findMany({
        where: { userId },
        include: {
          provider: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true } } } },
          service: { select: { name: true, price: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({ success: true, count: bookings.length, total, page, totalPages: Math.ceil(total / limit), data: bookings });
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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: { providerId: String(providerId) } }),
      prisma.booking.findMany({
        where: { providerId: String(providerId) },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true, email: true } },
          service: { select: { name: true, price: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({ success: true, count: bookings.length, total, page, totalPages: Math.ceil(total / limit), data: bookings });
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
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true, email: true } },
        provider: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true } } } },
        service: { select: { name: true, price: true } },
        review: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Authz: only the customer, the assigned provider, or admin may read it.
    if (req.user) {
      const me = String(req.user.id);
      const isCustomer = booking.userId === me;
      const isProvider = booking.provider && booking.provider.user && booking.provider.user.id === me;
      // provider.userId isn't selected above — fall back to a cheap lookup
      let providerOwns = isProvider;
      if (!providerOwns) {
        const prov = await prisma.provider.findUnique({ where: { id: booking.providerId }, select: { userId: true } });
        providerOwns = prov && String(prov.userId) === me;
      }
      if (!isCustomer && !providerOwns && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    return res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Get booking error:', error);
    return res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

/* Allowed status transitions: customers/providers/admins each have a lane.
 * This closes the old hole where ANY logged-in user could set ANY booking
 * to ANY status (e.g. pending -> completed without work done). */
const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'completed'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const existing = await prisma.booking.findUnique({
      where: { id: String(bookingId) },
      include: { provider: { select: { userId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    // Authz: customer, assigned provider, or admin only.
    const me = String(req.user.id);
    const isCustomer = existing.userId === me;
    const isProvider = existing.provider && existing.provider.userId === me;
    const isAdmin = req.user.role === 'admin';
    if (!isCustomer && !isProvider && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    // Providers move work forward; customers may only cancel; admin may do all.
    if (!isAdmin) {
      if (isCustomer && status !== 'cancelled') {
        return res.status(403).json({ error: 'Customers can only cancel — the provider updates progress.' });
      }
      if (isProvider && isCustomer) {
        // same person edge (provider booking themselves) — allow provider lane
      } else if (isProvider && ['pending', 'confirmed', 'in_progress', 'completed'].includes(existing.status) === false) {
        return res.status(400).json({ error: 'Cannot change status from ' + existing.status });
      }
      const allowed = STATUS_FLOW[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Cannot move booking from ${existing.status} to ${status}` });
      }
      // 'completed' must go through the provider completion flow (notifies + review prompt)
      if (status === 'completed' && !isProvider) {
        return res.status(403).json({ error: 'Only the provider can mark the job complete.' });
      }
    }

    const booking = await prisma.booking.update({ where: { id: String(bookingId) }, data: { status } });
    try {
      const ev = require('../utils/events');
      ev.emitTo(existing.userId, 'booking', { type: 'status', bookingId: booking.id, status });
      if (existing.provider) ev.emitTo(existing.provider.userId, 'booking', { type: 'status', bookingId: booking.id, status });
      const fan = require('../utils/notify').bookingFanout;
      const full = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { service: { select: { name: true } } },
      });
      const [cust, pUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: existing.userId }, select: { email: true, phone: true, firstName: true, lastName: true } }),
        existing.provider ? prisma.user.findUnique({ where: { id: existing.provider.userId }, select: { email: true, phone: true, firstName: true, lastName: true } }) : null,
      ]);
      if (status === 'confirmed') await fan('booking_confirmed', full || booking, { customer: cust || {}, provider: pUser || {} });
      if (status === 'cancelled') {
        await fan('booking_cancelled', full || booking, {
          customer: cust || {}, provider: pUser || {},
          cancelledBy: isProvider && !isCustomer ? 'provider' : isAdmin ? 'admin' : 'customer',
        });
      }
    } catch (e) {}
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

    // Only the customer (or admin) can cancel
    if (req.user.role !== 'admin' && booking.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the customer can cancel this booking' });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot cancel this booking in its current status' });
    }

    const updated = await prisma.booking.update({
      where: { id: String(bookingId) },
      data: { status: 'cancelled', notes: reason || 'Cancelled by user' }
    });

    try {
      const fan = require('../utils/notify').bookingFanout;
      const full = await prisma.booking.findUnique({
        where: { id: updated.id },
        include: { service: { select: { name: true } }, provider: { select: { userId: true } } },
      });
      const [cust, pUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: booking.userId }, select: { email: true, phone: true, firstName: true, lastName: true } }),
        full && full.provider ? prisma.user.findUnique({ where: { id: full.provider.userId }, select: { email: true, phone: true, firstName: true, lastName: true } }) : null,
      ]);
      await fan('booking_cancelled', full || updated, { customer: cust || {}, provider: pUser || {}, cancelledBy: 'customer' });
    } catch (e) {}

    return res.json({ success: true, message: 'Booking cancelled', data: updated });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Reschedule a booking (customer/admin; pending or confirmed only)
exports.rescheduleBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, startTime } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: String(bookingId) },
      include: { service: { select: { name: true } } }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role !== 'admin' && booking.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the customer can reschedule this booking' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Only pending or confirmed bookings can be rescheduled' });
    }
    if (!date || !startTime) return res.status(400).json({ error: 'date and startTime are required' });

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return res.status(400).json({ error: 'New date cannot be in the past' });

    const allowedTimes = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
      'Morning (8–11)', 'Midday (11–2)', 'Afternoon (2–5)', 'Evening (5–8)'];
    if (!allowedTimes.includes(String(startTime))) {
      return res.status(400).json({ error: 'Invalid start time' });
    }

    const clash = await prisma.booking.findFirst({
      where: {
        providerId: booking.providerId,
        date: d,
        startTime: String(startTime),
        status: { in: ['pending', 'confirmed', 'in_progress'] },
        NOT: { id: booking.id },
      },
      select: { id: true },
    });
    if (clash) return res.status(409).json({ error: 'That slot is already taken. Pick another time.' });

    const updated = await prisma.booking.update({
      where: { id: String(bookingId) },
      data: { date: d, startTime: String(startTime) }
    });

    // Notify the provider
    try {
      await prisma.notification.create({
        data: {
          bookingId: booking.id,
          providerId: booking.providerId,
          userId: booking.userId,
          type: 'booking_rescheduled',
          title: 'Booking rescheduled',
          message: `Customer moved ${booking.service ? booking.service.name : 'the booking'} (${booking.bookingRef}) to ${d.toDateString()} · ${startTime}.`,
          status: 'unread'
        }
      });
    } catch (e) { console.error('Reschedule notify error:', e.message); }

    return res.json({ success: true, message: 'Booking rescheduled', data: updated });
  } catch (error) {
    console.error('Reschedule booking error:', error);
    return res.status(500).json({ error: 'Failed to reschedule booking' });
  }
};

// Update payment for a booking (customer sets method; provider/admin can mark paid)
exports.updatePayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentMethod, paymentStatus } = req.body;

    const allowedMethods = ['cash', 'esewa', 'khalti', 'bank'];
    const allowedStatus = ['unpaid', 'paid', 'refund_requested', 'refunded'];

    const booking = await prisma.booking.findUnique({
      where: { id: String(bookingId) },
      include: { provider: { select: { userId: true } } }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const me = String(req.user.id);
    const isCustomer = booking.userId === me;
    const isProvider = booking.provider.userId === me;
    const isAdmin = req.user.role === 'admin';
    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = {};
    if (paymentMethod !== undefined) {
      const m = String(paymentMethod).toLowerCase();
      if (!allowedMethods.includes(m)) return res.status(400).json({ error: 'Invalid payment method' });
      data.paymentMethod = m;
    }
    if (paymentStatus !== undefined) {
      const s = String(paymentStatus).toLowerCase();
      if (!allowedStatus.includes(s)) return res.status(400).json({ error: 'Invalid payment status' });
      // Only provider/admin can mark paid/refunded; customers can keep it unpaid
      if ((s === 'paid' || s === 'refunded') && !isProvider && !isAdmin) {
        return res.status(403).json({ error: 'Only the provider can confirm payment' });
      }
      // Refunds only make sense on completed/paid bookings
      if (s === 'refunded' && !['completed'].includes(booking.status) && booking.paymentStatus !== 'paid') {
        return res.status(400).json({ error: 'Only completed or paid bookings can be refunded' });
      }
      data.paymentStatus = s;
    }
    // Wallet/bank reference submitted by the customer ("I've paid, ref ...").
    // No schema change: the ref is recorded on a payment_claimed
    // notification so the provider can verify it in their wallet app.
    let claimedRef = null;
    if (req.body.paymentRef !== undefined && req.body.paymentRef !== null && String(req.body.paymentRef).trim() !== '') {
      if (!isCustomer && !isAdmin) return res.status(403).json({ error: 'Only the customer can submit a payment reference' });
      claimedRef = String(req.body.paymentRef).trim().slice(0, 64);
      const method = data.paymentMethod || booking.paymentMethod || 'cash';
      const check = checkWalletRef(String(method), claimedRef);
      if (!check.ok) return res.status(400).json({ error: check.error });
    }
    if (!Object.keys(data).length && !claimedRef) return res.status(400).json({ error: 'Nothing to update' });

    const updated = await prisma.booking.update({
      where: { id: String(bookingId) },
      data
    });

    if (claimedRef) {
      try {
        await prisma.notification.create({
          data: {
            bookingId: booking.id,
            providerId: booking.providerId,
            userId: booking.userId,
            type: 'payment_claimed',
            title: 'Payment claimed by customer',
            message: `Customer says they paid ${updated.totalAmount} via ${(data.paymentMethod || booking.paymentMethod || 'wallet').toUpperCase()}. Ref: ${claimedRef}. Verify in your wallet app, then Mark paid.`,
            status: 'unread'
          }
        });
      } catch (e) { console.error('Payment claim notify error:', e.message); }
    }

    // Tell the customer when money is confirmed or refunded
    if (data.paymentStatus === 'paid' || data.paymentStatus === 'refunded') {
      try {
        await prisma.notification.create({
          data: {
            bookingId: booking.id,
            providerId: booking.providerId,
            userId: booking.userId,
            type: data.paymentStatus === 'paid' ? 'payment_confirmed' : 'payment_refunded',
            title: data.paymentStatus === 'paid' ? 'Payment confirmed' : 'Payment refunded',
            message: data.paymentStatus === 'paid'
              ? `Your payment of ${updated.totalAmount} (${(updated.paymentMethod || 'cash').toUpperCase()}) for ${booking.bookingRef} is confirmed. Receipt is in your dashboard.`
              : `Your payment for ${booking.bookingRef} was refunded. Contact support if the amount does not arrive in 3–5 days.`,
            status: 'unread'
          }
        });
      } catch (e) { console.error('Payment status notify error:', e.message); }
    }

    return res.json({ success: true, message: 'Payment updated', data: updated });
  } catch (error) {
    console.error('Update payment error:', error);
    return res.status(500).json({ error: 'Failed to update payment' });
  }
};

/* Wallet reference format checks (eSewa/Khalti/bank).
   Live API verification (merchant credentials) plugs in here:
   set ESEWA_MERCHANT / KHALTI_SECRET_KEY and extend verifyWalletLive(). */
function checkWalletRef(method, ref) {
  const m = String(method).toLowerCase();
  if (m === 'cash') return { ok: true };
  if (!ref || ref.length < 4) return { ok: false, error: 'Enter the transaction reference from your wallet/bank app (min 4 characters).' };
  if (!/^[A-Za-z0-9\-_ ]+$/.test(ref)) return { ok: false, error: 'Reference can only contain letters, numbers, spaces and -_.' };
  if ((m === 'esewa' || m === 'khalti') && ref.replace(/\D/g, '').length < 6 && ref.length < 8) {
    return { ok: false, error: 'That reference looks too short — copy the full transaction ID from your ' + m + ' history.' };
  }
  return { ok: true };
}

// Manual verification hook for a claimed wallet payment.
// Today: format check only (needsCredentials: true until merchant
// keys exist). The provider still confirms by checking their app.
exports.verifyPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentRef } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const me = String(req.user.id);
    if (booking.userId !== me && req.user.role !== 'admin') {
      const prov = await prisma.provider.findUnique({ where: { id: booking.providerId }, select: { userId: true } });
      if (!prov || prov.userId !== me) return res.status(403).json({ error: 'Forbidden' });
    }
    const check = checkWalletRef(booking.paymentMethod || 'cash', String(paymentRef || ''));
    if (!check.ok) return res.status(400).json({ error: check.error });
    return res.json({ success: true, formatOk: true, needsCredentials: true, message: 'Reference format looks good. Live eSewa/Khalti API verification activates once merchant keys are configured.' });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
};
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
      select: { firstName: true, lastName: true, email: true, phone: true }
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

    try {
      const fan = require('../utils/notify').bookingFanout;
      const cust = await prisma.user.findUnique({
        where: { id: booking.userId },
        select: { email: true, phone: true, firstName: true, lastName: true },
      });
      await fan('booking_completed', { ...updated, bookingRef: booking.bookingRef, service: booking.service }, { customer: cust || {}, provider: providerUser || {} });
    } catch (e) {}

    return res.json({ success: true, message: 'Booking marked as completed', data: updated });
  } catch (error) {
    console.error('Mark completed error:', error);
    return res.status(500).json({ error: 'Failed to mark booking as completed' });
  }
};
