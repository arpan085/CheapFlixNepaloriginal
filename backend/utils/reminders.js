/* Upcoming-booking reminders (no cron service needed).
 * startReminders() runs once at boot (after 60s) and then hourly:
 * finds CONFIRMED bookings in the next 24h that never got a
 * `booking_reminder` notification, and nudges customer + provider.
 * Idempotent via the notification-exists check — safe to re-run.
 */
const prisma = require('../config/database');

async function runOnce() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming = await prisma.booking.findMany({
      where: { status: 'confirmed', date: { gte: now, lt: soon } },
      select: {
        id: true, bookingRef: true, date: true, startTime: true,
        userId: true, providerId: true,
        service: { select: { name: true } },
      },
      take: 100,
    });
    let sent = 0;
    for (const b of upcoming) {
      const already = await prisma.notification.findFirst({
        where: { bookingId: b.id, type: 'booking_reminder' },
        select: { id: true },
      });
      if (already) continue;
      const when = `${new Date(b.date).toDateString()} · ${b.startTime}`;
      const svc = (b.service && b.service.name) || 'your service';
      await prisma.notification.createMany({
        data: [
          {
            bookingId: b.id, providerId: b.providerId, userId: b.userId,
            type: 'booking_reminder', title: 'Reminder: job tomorrow',
            message: `${svc} (${b.bookingRef}) is scheduled ${when}. Chat is open if plans changed.`,
            status: 'unread',
          },
        ],
      });
      sent++;
    }
    if (sent) console.log(`[reminders] sent ${sent} upcoming-job reminders`);
  } catch (e) {
    console.error('[reminders] run failed:', e.message);
  }
}

function startReminders() {
  if (process.env.ENABLE_REMINDERS === 'false') return;
  setTimeout(runOnce, 60 * 1000);
  setInterval(runOnce, 60 * 60 * 1000);
}

module.exports = { startReminders, runOnce };
