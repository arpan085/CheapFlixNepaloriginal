const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { securityHeaders, authLimiter, globalLimiter } = require('./middleware/security');

const app = express();
app.disable('x-powered-by');
// Behind Render/Railway proxies — needed for correct req.ip (rate limiter).
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Fail fast on missing critical config
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('[boot] Missing required env vars: ' + missingEnv.join(', '));
  process.exit(1);
}
// Weak-secret tripwire: the checked-in dev secret must never reach production.
if (String(process.env.JWT_SECRET).length < 32) {
  console.error('[boot] WARNING: JWT_SECRET is shorter than 32 chars. Generate a strong one (e.g. `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"`) and rotate it in every environment. USING IT IN PRODUCTION INVALIDATES ALL SESSIONS ON ROTATION — plan a maintenance window.');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Middleware
// Allowed origins: CORS_ORIGIN (comma-separated, authoritative when set),
// then FRONTEND_URLS / FRONTEND_URL. Public site defaults for local dev only.
// In production a missing allow-list is a boot error — never "*" and never
// open to every origin.
const allowedOrigins = [];
function addOrigin(o) {
  const clean = String(o || '').trim().replace(/\/$/, '');
  if (clean && clean !== '*' && !allowedOrigins.includes(clean)) allowedOrigins.push(clean);
}
if (process.env.CORS_ORIGIN) {
  for (const o of String(process.env.CORS_ORIGIN).split(',')) addOrigin(o);
} else {
  addOrigin('https://cheapflixnepal.live');
  addOrigin('https://cheapflixnepal.netlify.app');
  addOrigin('http://localhost:5500');
  addOrigin('http://localhost:3000');
}
if (process.env.FRONTEND_URLS) {
  for (const o of String(process.env.FRONTEND_URLS).split(',')) addOrigin(o);
}
if (process.env.FRONTEND_URL) addOrigin(process.env.FRONTEND_URL);
if (process.env.CORS_ORIGIN && String(process.env.CORS_ORIGIN).split(',').some((o) => o.trim() === '*')) {
  console.error('[boot] CORS_ORIGIN must not contain "*". Refusing to start with open CORS.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('[boot] No CORS origins configured. Set CORS_ORIGIN (or FRONTEND_URL) and redeploy.');
  process.exit(1);
}

// Safe boot report — presence only, never values.
try {
  const { neonEnabled, bucket } = require('./utils/storage');
  console.log('DATABASE configured: ' + (process.env.DATABASE_URL ? 'yes' : 'no'));
  console.log('Storage configured: ' + (neonEnabled() ? 'yes' : 'no'));
  console.log('Storage bucket: ' + bucket());
} catch (e) {
  console.log('Storage configured: unknown');
}

app.use(securityHeaders);
app.use(require('./middleware/analytics').analyticsMiddleware);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
// Per-IP abuse shield for the whole API (long-lived SSE counts once).
app.use('/api', globalLimiter);

// Uploaded files (avatars, KYC, review photos). uploads/ is gitignored.
const path = require('path');
const { UPLOAD_ROOT } = require('./middleware/upload');
app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d' }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const providerRoutes = require('./routes/providerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const fileRoutes = require('./routes/fileRoutes');

// API Routes (auth is rate-limited against brute force)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', fileRoutes); // GET /api/files/<key> -> presigned S3 redirect

// Services endpoint (public, paginated: ?page=1&limit=20, max 100)
const prisma = require('./config/database');
app.get('/api/services', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [total, services] = await Promise.all([
      prisma.service.count(),
      prisma.service.findMany({
        include: {
          provider: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ success: true, count: services.length, total, page, totalPages: Math.ceil(total / limit), data: services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check (includes DB so Render/hosts can detect outages)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'Server is running ✅', db: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'Server running but DB unreachable', db: 'down' });
  }
});

// Live event stream (Server-Sent Events, no extra deps).
// Browsers can't set headers on EventSource, so the access token
// travels as ?token= (TLS protects it; it is never logged).
// Emits: chat, booking, payment, reminder events for this user.
app.get('/api/stream', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    require('./utils/events').subscribe(payload.id, res);
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (Prisma known errors -> clean status codes)
app.use((err, req, res, next) => {
  if (err && err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  if (err && err.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate value for a unique field' });
  }
  console.error('[error]', err && err.message ? err.message : err);
  res.status(err && err.status ? err.status : 500).json({ error: (err && err.message) || 'Server error' });
});

// Hourly upcoming-job reminders (no-op with ENABLE_REMINDERS=false).
try { require('./utils/reminders').startReminders(); } catch (e) { console.error('[boot] reminders disabled:', e.message); }

// Never die silently: log crashes. Exit in production so the host restarts
// cleanly; stay up in development so one bad request can't kill the server.
process.on('unhandledRejection', (reason) => {
  console.error('[crash] unhandled rejection:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[crash] uncaught exception:', err && err.message ? err.message : err);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════╗
║   Cheapflix Nepal Backend 🚀      ║
║   Server running on port ${PORT}   ║
║   http://localhost:${PORT}          ║
╚═══════════════════════════════════╝
  `);
});
  