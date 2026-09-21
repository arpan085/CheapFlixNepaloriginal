/* Notify fan-out tests — no keys configured, so everything must
 * degrade to log/no-op and never throw. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

delete process.env.RESEND_API_KEY;
delete process.env.SPARROW_SMS_TOKEN;
delete process.env.NOTIFY_SMS_EVENTS;

const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');
const { bookingFanout } = require('../utils/notify');

const booking = {
  id: 'b1', bookingRef: 'CF-1', service: { name: 'Plumbing' },
  date: new Date(), startTime: '09:00 AM', totalAmount: 1000,
};
const parties = {
  customer: { email: '', phone: '', firstName: 'A', lastName: 'B' },
  provider: { email: '', phone: '', firstName: 'P', lastName: 'Q' },
};

describe('mailer/sms without keys', () => {
  it('sendMail logs instead of sending', async () => {
    assert.deepEqual(await sendMail({ to: 'a@b.c', subject: 's', html: '<p>h</p>' }), { sent: false, mode: 'log' });
  });
  it('sendSms logs instead of sending', async () => {
    assert.deepEqual(await sendSms({ to: '9841111111', text: 'hi' }), { sent: false, mode: 'log' });
  });
});

describe('bookingFanout', () => {
  it('handles every event with empty contacts', async () => {
    for (const ev of ['booking_request', 'booking_confirmed', 'booking_cancelled', 'booking_completed']) {
      await bookingFanout(ev, booking, { ...parties, cancelledBy: 'customer' });
    }
  });
  it('handles missing parties entirely', async () => {
    await bookingFanout('booking_confirmed', booking, {});
    await bookingFanout('booking_confirmed', booking);
  });
});
