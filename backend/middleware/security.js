/* Zero-dependency hardening: security headers + in-memory rate limiter.
   (helmet / express-rate-limit are not installed and the deploy
   environment has no registry access, so this ships with the app.) */

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // API serves JSON only — lock down content sources for API consumers.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  // HSTS only helps over HTTPS; harmless locally, enforced in production.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Express already hides X-Powered-By only if disabled — do it here.
  res.removeHeader('X-Powered-By');
  next();
}

/* Sliding-window limiter keyed by IP (+ route). Not shared across
   processes — good enough for a single Render/Railway instance;
   put a WAF/CDN in front when you scale horizontally. */
const buckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < 15 * 60 * 1000);
    if (fresh.length) buckets.set(key, fresh);
    else buckets.delete(key);
  }
}, 60 * 1000).unref();

/* Options:
 *   scope  — extra key segment so different routes get separate buckets
 *            (e.g. failed logins don't eat the registration budget).
 *   global — count every request from an IP in one bucket (abuse shield).
 *   keyEmail — also key on the submitted email (slows credential stuffing
 *            that rotates IPs but hammers one account). */
function rateLimit({ windowMs, max, message, scope, global, keyEmail }) {
  return (req, res, next) => {
    const ip =
      req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    let key = global ? 'g|' + ip : ip + '|' + (req.baseUrl || '') + (scope ? '|' + scope : '');
    if (keyEmail && req.body && req.body.email) {
      key += '|e=' + String(req.body.email).trim().toLowerCase().slice(0, 100);
    }
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    hits.push(now);
    buckets.set(key, hits);
    const remaining = Math.max(0, max - hits.length);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    if (hits.length > max) {
      const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: message || 'Too many requests. Slow down and try again.' });
    }
    next();
  };
}

module.exports = {
  securityHeaders,
  rateLimit,
  // Abuse shield for the whole API (600 req/min per IP — generous for
  // humans, stops runaway scrapers). Long-lived SSE streams count once.
  globalLimiter: rateLimit({ windowMs: 60 * 1000, max: 600, global: true }),
  // Login is the brute-force target: 10 tries per 15 min per IP *and*
  // per email, so one attacker can't lock out others sharing an IP.
  loginLimiter: rateLimit({ windowMs: 15 * 60 * 1000, max: 10, scope: 'login', keyEmail: true, message: 'Too many login attempts. Try again in a few minutes.' }),
  // Registration / password-reset / OTP: 60 per 15 min per IP.
  authLimiter: rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many auth attempts. Try again in a few minutes.' }),
  // OTP sends cost real SMS credits: 5 per hour per IP.
  otpLimiter: rateLimit({ windowMs: 60 * 60 * 1000, max: 5, scope: 'otp', message: 'Too many codes sent. Try again in an hour.' }),
  // Chat/support writes + booking creation.
  writeLimiter: rateLimit({ windowMs: 60 * 1000, max: 60 }),
};
