/* Payments ledger + refunds + provider availability API.
 *
 * Tables (prisma schema): Payment, ProviderDayOff.
 * If the DB hasn't been migrated yet (no Payment table), payment writes
 * fall back to Booking.paymentStatus + Notification so old deploys keep
 * working — see `ledgerAvailable` below.
 */
const prisma = require('../config/database');
const { verifyPaymentRef, liveCapable } = require('../utils/payments');

let ledgerWarned = false;
async function ledgerAvailable() {
  try {
    await prisma.payment.findFirst({ select: { id: true } });
    return true;
  } catch (e) {
    if (!ledgerWarned) {
      console.warn('[payments] Payment table missing — run `prisma migrate deploy`. Falling back to booking fields.');
      ledgerWarned = true;
    }
    return false;
  }
}

async function mustOwnBooking(req, bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: String(bookingId) },
    include: { provider: { select: { userId: true } } },
  });
  if (!booking) return { error: 'Booking not found', status: 404 };
  const me = String(req.user.id);
  const role = req.user.role;
  const isCustomer = booking.userId === me;
  const isProvider = booking.provider && booking.provider.userId === me;
  if (!isCustomer && !isProvider && role !== 'admin') return { error: 'Forbidden', status: 403, booking };
  return { booking, isCustomer, isProvider, isAdmin: role === 'admin' };
}

/* POST /api/payments/initiate — customer starts a wallet payment.
 * Returns eSewa signed payload (when keys exist) or manual-pay
 * instructions (QR text / merchant ID) otherwise. */
exports.initiate = async (req, res) => {
  try {
    const { bookingId, method } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });
    const m = String(method || '').toLowerCase();
    if (!['esewa', 'khalti', 'bank', 'cash'].includes(m)) return res.status(400).json({ error: 'Invalid method' });
    const own = await mustOwnBooking(req, bookingId);
    if (own.error) return res.status(own.status).json({ error: own.error });
    if (!own.isCustomer && !own.isAdmin) return res.status(403).json({ error: 'Only the customer can start a payment' });

    const booking = own.booking;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentMethod: m },
    });

    if (m === 'cash') return res.json({ success: true, mode: 'cash', message: 'Pay the provider in hand after the job.' });
    if (m === 'bank') {
      return res.json({
        success: true, mode: 'manual',
        message: 'Transfer to the provider account shared on confirmation, then paste the reference.',
        accountHint: process.env.BANK_ACCOUNT_HINT || 'Provider shares account details in chat after confirmation.',
      });
    }
    // esewa / khalti
    if (liveCapable(m)) {
      const { signEsewaRequest, cfg } = require('../utils/payments');
      if (m === 'esewa') {
        const c = cfg();
        const txn = `${booking.bookingRef}-${Date.now().toString().slice(-6)}`;
        const { signature, signedFieldNames } = signEsewaRequest({ totalAmount: booking.totalAmount, transactionUuid: txn });
        return res.json({
          success: true, mode: 'esewa_api',
          data: {
            amount: booking.totalAmount,
            product_code: c.esewaMerchant,
            transaction_uuid: txn,
            signature, signed_field_names: signedFieldNames,
            success_url: (process.env.FRONTEND_URL || '') + '/pages/dashboard.html?pay=success&booking=' + booking.id,
            failure_url: (process.env.FRONTEND_URL || '') + '/pages/dashboard.html?pay=failed&booking=' + booking.id,
          },
        });
      }
      return res.json({
        success: true, mode: 'khalti_api',
        message: 'Create the Khalti payment from your app, then paste the pidx here to verify.',
      });
    }
    return res.json({
      success: true, mode: 'manual',
      message: `Pay with ${m.toUpperCase()} on job day, then paste the transaction reference — the provider verifies it.`,
      live: false,
    });
  } catch (e) {
    console.error('Payment initiate error:', e);
    return res.status(500).json({ error: 'Could not start payment' });
  }
};

/* POST /api/payments/verify — customer (or provider re-check) verifies a ref.
 * Body: { bookingId, reference, method? } */
exports.verify = async (req, res) => {
  try {
    const { bookingId, reference, method } = req.body || {};
    if (!bookingId || !reference) return res.status(400).json({ error: 'bookingId and reference are required' });
    const own = await mustOwnBooking(req, bookingId);
    if (own.error) return res.status(own.status).json({ error: own.error });
    const booking = own.booking;
    const m = String(method || booking.paymentMethod || 'esewa').toLowerCase();

    const result = await verifyPaymentRef({ method: m, reference: String(reference).trim(), amount: booking.totalAmount });

    // Record in ledger (or fall back to notification only).
    if (await ledgerAvailable()) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          method: m,
          amount: booking.totalAmount,
          reference: String(reference).trim().slice(0, 64),
          status: result.verified ? 'verified' : 'claimed',
          verifyMode: result.mode,
          verifyNote: String(result.note || '').slice(0, 500),
        },
      });
    }
    try {
      await prisma.notification.create({
        data: {
          bookingId: booking.id,
          providerId: booking.providerId,
          userId: booking.userId,
          type: result.verified ? 'payment_verified' : 'payment_claimed',
          title: result.verified ? 'Payment verified' : 'Payment claimed by customer',
          message: result.verified
            ? `${m.toUpperCase()} payment ${booking.totalAmount} verified (${reference}). You can mark it paid.`
            : `Customer says they paid ${booking.totalAmount} via ${m.toUpperCase()}. Ref: ${reference}. ${result.note || ''} Verify in your wallet app, then Mark paid.`,
          status: 'unread',
        },
      });
    } catch (e) { console.error('payment notify error:', e.message); }

    try {
      const ev = require('../utils/events');
      if (own.booking.provider) ev.emitTo(own.booking.provider.userId, 'payment', { bookingId: booking.id, verified: result.verified });
      ev.emitTo(booking.userId, 'payment', { bookingId: booking.id, verified: result.verified });
    } catch (e) {}

    return res.json({ success: result.ok, verified: result.verified, mode: result.mode, message: result.note });
  } catch (e) {
    console.error('Payment verify error:', e);
    return res.status(500).json({ error: 'Verification failed' });
  }
};

/* GET /api/payments/booking/:bookingId — payment history for a booking. */
exports.history = async (req, res) => {
  try {
    const own = await mustOwnBooking(req, req.params.bookingId);
    if (own.error) return res.status(own.status).json({ error: own.error });
    if (!(await ledgerAvailable())) {
      return res.json({ success: true, migrated: false, data: [], message: 'Ledger not migrated yet — see booking paymentStatus.' });
    }
    const rows = await prisma.payment.findMany({
      where: { bookingId: String(req.params.bookingId) },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, migrated: true, data: rows });
  } catch (e) {
    console.error('Payment history error:', e);
    return res.status(500).json({ error: 'Could not load payments' });
  }
};

/* POST /api/payments/:bookingId/refund-request — customer asks for money back. */
exports.refundRequest = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const own = await mustOwnBooking(req, req.params.bookingId);
    if (own.error) return res.status(own.status).json({ error: own.error });
    if (!own.isCustomer && !own.isAdmin) return res.status(403).json({ error: 'Only the customer can request a refund' });
    const booking = own.booking;
    if (booking.paymentStatus !== 'paid') return res.status(400).json({ error: 'Only paid bookings can be refunded' });
    if (!['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ error: 'Refunds open after the job is completed or cancelled' });
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'refund_requested' } });
    if (await ledgerAvailable()) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id, userId: booking.userId, method: booking.paymentMethod || 'cash',
          amount: booking.totalAmount, reference: null, status: 'refund_requested',
          verifyMode: 'manual', verifyNote: String(reason || 'Customer requested a refund').slice(0, 500),
        },
      });
    }
    await prisma.notification.create({
      data: {
        bookingId: booking.id, providerId: booking.providerId, userId: booking.userId,
        type: 'refund_requested', title: 'Refund requested',
        message: `Customer requested a refund of ${booking.totalAmount} for ${booking.bookingRef}. Reason: ${String(reason || 'not given').slice(0, 200)}`,
        status: 'unread',
      },
    });
    return res.json({ success: true, message: 'Refund requested — the provider was notified.' });
  } catch (e) {
    console.error('Refund request error:', e);
    return res.status(500).json({ error: 'Could not request refund' });
  }
};

/* POST /api/payments/:bookingId/refund-approve — provider/admin confirms money returned. */
exports.refundApprove = async (req, res) => {
  try {
    const own = await mustOwnBooking(req, req.params.bookingId);
    if (own.error) return res.status(own.status).json({ error: own.error });
    if (!own.isProvider && !own.isAdmin) return res.status(403).json({ error: 'Only the provider can confirm a refund' });
    const booking = own.booking;
    if (booking.paymentStatus !== 'refund_requested' && booking.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Nothing to refund on this booking' });
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'refunded' } });
    if (await ledgerAvailable()) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id, userId: booking.userId, method: booking.paymentMethod || 'cash',
          amount: booking.totalAmount, reference: null, status: 'refunded',
          verifyMode: 'manual', verifyNote: 'Provider confirmed money returned.',
        },
      });
    }
    await prisma.notification.create({
      data: {
        bookingId: booking.id, providerId: booking.providerId, userId: booking.userId,
        type: 'payment_refunded', title: 'Payment refunded',
        message: `Your payment for ${booking.bookingRef} was refunded. Contact support if the amount does not arrive in 3–5 days.`,
        status: 'unread',
      },
    });
    return res.json({ success: true, message: 'Marked as refunded.' });
  } catch (e) {
    console.error('Refund approve error:', e);
    return res.status(500).json({ error: 'Could not approve refund' });
  }
};

/* ---------- Provider availability ---------- */

/* GET /api/payments/availability/:providerId?month=YYYY-MM — public.
 * Returns booked slots + day-offs + weekly offs for a month. */
exports.getAvailability = async (req, res) => {
  try {
    const providerId = String(req.params.providerId);
    const month = String(req.query.month || new Date().toISOString().slice(0, 7)); // YYYY-MM
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) return res.status(400).json({ error: 'month must be YYYY-MM' });
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, isAvailable: true, weeklyOff: true },
    });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const bookings = await prisma.booking.findMany({
      where: {
        providerId,
        status: { in: ['pending', 'confirmed', 'in_progress'] },
        date: { gte: start, lt: end },
      },
      select: { date: true, startTime: true, status: true },
    });

    let dayOffs = [];
    try {
      dayOffs = await prisma.providerDayOff.findMany({
        where: { providerId, date: { gte: start, lt: end } },
      });
    } catch (e) { dayOffs = []; /* table not migrated yet */ }

    let weeklyOff = [];
    try { weeklyOff = JSON.parse(provider.weeklyOff || '[]'); } catch (e) { weeklyOff = []; }

    return res.json({
      success: true,
      data: {
        isAvailable: provider.isAvailable !== false,
        weeklyOff,
        booked: bookings.map((b) => ({ date: b.date, startTime: b.startTime, status: b.status })),
        dayOffs: dayOffs.map((d) => ({ date: d.date, slots: safeJson(d.slots), reason: d.reason })),
      },
    });
  } catch (e) {
    console.error('Get availability error:', e);
    return res.status(500).json({ error: 'Could not load availability' });
  }
};

/* PUT /api/payments/availability — provider sets their own schedule.
 * Body: { isAvailable?, weeklyOff?: [0-6], dayOffs?: [{date, slots?, reason?}] } */
exports.setAvailability = async (req, res) => {
  try {
    const { isAvailable, weeklyOff, dayOffs } = req.body || {};
    const provider = await prisma.provider.findUnique({ where: { userId: String(req.user.id) } });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });
    if (req.user.role !== 'admin') {
      // providerMiddleware already ensures role, but double-check ownership via userId lookup above
    }
    const data = {};
    if (isAvailable !== undefined) data.isAvailable = Boolean(isAvailable);
    if (weeklyOff !== undefined) {
      if (!Array.isArray(weeklyOff) || weeklyOff.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
        return res.status(400).json({ error: 'weeklyOff must be an array of weekday numbers 0–6' });
      }
      data.weeklyOff = JSON.stringify(weeklyOff);
    }
    if (Object.keys(data).length) {
      await prisma.provider.update({ where: { id: provider.id }, data });
    }
    if (dayOffs !== undefined) {
      if (!Array.isArray(dayOffs)) return res.status(400).json({ error: 'dayOffs must be an array' });
      for (const d of dayOffs.slice(0, 62)) {
        const dt = new Date(d.date + 'T00:00:00');
        if (Number.isNaN(dt.getTime())) continue;
        const slots = Array.isArray(d.slots) && d.slots.length ? JSON.stringify(d.slots.slice(0, 24)) : null;
        try {
          await prisma.providerDayOff.upsert({
            where: { providerId_date: { providerId: provider.id, date: dt } },
            update: { slots, reason: d.reason ? String(d.reason).slice(0, 200) : null },
            create: { providerId: provider.id, date: dt, slots, reason: d.reason ? String(d.reason).slice(0, 200) : null },
          });
        } catch (e) { /* table not migrated — ignore until migrate */ }
      }
    }
    try {
      try { const local = require('fs'); void local; } catch (e) {}
      const fresh = await prisma.provider.findUnique({
        where: { id: provider.id },
        select: { id: true, isAvailable: true, weeklyOff: true },
      });
      return res.json({ success: true, message: 'Availability saved.', data: fresh });
    } catch (e) {
      return res.json({ success: true, message: 'Availability saved.' });
    }
  } catch (e) {
    console.error('Set availability error:', e);
    return res.status(500).json({ error: 'Could not save availability' });
  }
};

/* DELETE /api/payments/availability/:date — provider re-opens a blocked day. */
exports.clearDayOff = async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: String(req.user.id) } });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });
    const dt = new Date(String(req.params.date) + 'T00:00:00');
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: 'Invalid date (YYYY-MM-DD)' });
    try {
      await prisma.providerDayOff.deleteMany({ where: { providerId: provider.id, date: dt } });
    } catch (e) { /* not migrated */ }
    return res.json({ success: true, message: 'Day re-opened.' });
  } catch (e) {
    console.error('Clear day off error:', e);
    return res.status(500).json({ error: 'Could not re-open day' });
  }
};

function safeJson(s) {
  try { const v = JSON.parse(s || 'null'); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
