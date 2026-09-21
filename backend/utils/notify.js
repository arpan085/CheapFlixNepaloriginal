/* Booking lifecycle fan-out: email + optional SMS on top of the
 * in-app notifications the controllers already create.
 *
 * - Email sends whenever RESEND_API_KEY is set (free tier covers us);
 *   without it everything degrades to a server log — never throws.
 * - SMS costs real credits, so it is OFF unless the event is listed in
 *   NOTIFY_SMS_EVENTS (comma-separated, e.g. "booking_request").
 *   The phone must be a valid Nepali mobile or it is skipped silently.
 */
const { sendMail } = require('./mailer');
const { sendSms } = require('./sms');

function front(path) {
  const f = process.env.FRONTEND_URL || '';
  return (f ? f.replace(/\/$/, '') : '') + path;
}

function smsEvents() {
  return String(process.env.NOTIFY_SMS_EVENTS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

function validPhone(phone) {
  return /^9[678]\d{8}$/.test(String(phone || '').replace(/[\s-]/g, ''));
}

async function mail(to, subject, html) {
  if (!to) return;
  try {
    await sendMail({ to, subject, html });
  } catch (e) {
    console.error('[notify] mail failed:', e.message);
  }
}

async function sms(to, text, event) {
  if (!to || !validPhone(to)) return;
  if (!smsEvents().includes(event)) return;
  try {
    await sendSms({ to: String(to).replace(/[\s-]/g, ''), text });
  } catch (e) {
    console.error('[notify] sms failed:', e.message);
  }
}

function nameOf(u) {
  return (((u && u.firstName) || '') + ' ' + ((u && u.lastName) || '')).trim() || 'there';
}

/* event: booking_request | booking_confirmed | booking_cancelled | booking_completed
 * parties: { customer, provider } — user rows ({ email, phone, firstName, lastName }) */
async function bookingFanout(event, booking, parties) {
  const ref = booking.bookingRef || String(booking.id).slice(0, 8);
  const svc = (booking.service && booking.service.name) || 'your service';
  const when = `${booking.date ? new Date(booking.date).toDateString() : ''} · ${booking.startTime || ''}`;
  const total = booking.totalAmount != null ? `Rs ${booking.totalAmount}` : '';
  const { customer = {}, provider = {} } = parties || {};

  if (event === 'booking_request') {
    await mail(provider.email, `New booking request ${ref}`,
      `<p>Namaste ${nameOf(provider)},</p><p><b>${nameOf(customer)}</b> requested <b>${svc}</b> for <b>${when}</b> (${total}).</p><p><a href="${front('/pages/provider-dashboard.html')}">Accept within 24 hours</a> to keep your response badge.</p><p>— Cheapflix Nepal</p>`);
    await sms(provider.phone, `Cheapflix: new ${svc} request ${ref} (${when}). Open your dashboard to accept.`, event);
  } else if (event === 'booking_confirmed') {
    await mail(customer.email, `Booking ${ref} confirmed ✓`,
      `<p>Namaste ${nameOf(customer)},</p><p><b>${nameOf(provider)}</b> accepted your <b>${svc}</b> booking for <b>${when}</b> (${total}).</p><p>Chat is open — <a href="${front('/pages/dashboard.html')}">track it here</a>. Pay only after the work is done.</p><p>— Cheapflix Nepal</p>`);
    await sms(customer.phone, `Cheapflix: ${ref} confirmed for ${when}. Pay after the job.`, event);
  } else if (event === 'booking_cancelled') {
    const byProvider = parties.cancelledBy === 'provider';
    const to = byProvider ? customer : provider;
    await mail(to.email, `Booking ${ref} cancelled`,
      `<p>Namaste ${nameOf(to)},</p><p>Booking <b>${ref}</b> (${svc}, ${when}) was cancelled${byProvider ? ' by the provider' : ''}.</p><p><a href="${front('/pages/booking-flow.html')}">Book again</a> or reply to your <a href="${front('/pages/support.html')}">support ticket</a> if you need help.</p><p>— Cheapflix Nepal</p>`);
    await sms(to.phone, `Cheapflix: booking ${ref} was cancelled.`, event);
  } else if (event === 'booking_completed') {
    await mail(customer.email, `How was ${svc}? Leave a review`,
      `<p>Namaste ${nameOf(customer)},</p><p><b>${nameOf(provider)}</b> marked <b>${ref}</b> complete. Please <a href="${front('/pages/dashboard.html')}">leave a review</a> — it takes 30 seconds and helps neighbours choose.</p><p>— Cheapflix Nepal</p>`);
    await sms(customer.phone, `Cheapflix: ${ref} done. Tap to review: ${front('/pages/dashboard.html')}`, event);
  }
}

module.exports = { bookingFanout, mail, sms };
