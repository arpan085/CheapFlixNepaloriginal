/* Tiny privacy-friendly analytics: in-memory counters since boot.
   No cookies, no user tracking — just route hits + booking revenue
   from the DB. Resets on restart (labelled as such in the UI). */
const startedAt = Date.now();
const hits = new Map();

function analyticsMiddleware(req, res, next) {
  if (req.path === '/api/health') return next();
  // Collapse IDs so /bookings/abc123 and /bookings/xyz789 share a bucket.
  const norm = req.path.replace(/\/[A-Za-z0-9_-]{8,}(?=\/|$)/g, '/:id');
  const key = `${req.method} ${norm}`;
  hits.set(key, (hits.get(key) || 0) + 1);
  next();
}

async function analyticsHandler(prisma) {
  const total = [...hits.values()].reduce((a, b) => a + b, 0);
  const top = [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([route, count]) => ({ route, count }));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let bookingsToday = 0;
  let revenueToday = 0;
  try {
    bookingsToday = await prisma.booking.count({ where: { createdAt: { gte: today } } });
    const agg = await prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: today }, paymentStatus: 'paid' }
    });
    revenueToday = agg._sum.totalAmount || 0;
  } catch (e) { /* DB down — traffic stats still work */ }
  return {
    sinceRestart: new Date(startedAt).toISOString(),
    uptimeMin: Math.round((Date.now() - startedAt) / 60000),
    totalRequests: total,
    topRoutes: top,
    bookingsToday,
    revenueToday
  };
}

module.exports = { analyticsMiddleware, analyticsHandler };
