/* Access + refresh token issuance (zero new deps).
 * - Access: signed JWT, lifetime = JWT_EXPIRE (default 7d).
 * - Refresh: 256-bit random, sha256-hashed at rest, 30d TTL, single-use
 *   rotation. If the RefreshToken table isn't migrated yet, refresh
 *   issuance is skipped and auth keeps working on access tokens alone.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function accessToken(user) {
  // Short-lived access (default 12h) + 30-day rotating refresh tokens.
  // Set JWT_EXPIRE=15m for maximum security; the app auto-refreshes.
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '12h' }
  );
}

function hashRefresh(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

/* Returns { token, refreshToken|null }. Never throws for missing table. */
async function issuePair(user) {
  const token = accessToken(user);
  try {
    const raw = crypto.randomBytes(32).toString('hex');
    await prisma.refreshToken.create({
      data: {
        userId: String(user.id),
        tokenHash: hashRefresh(raw),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { token, refreshToken: raw };
  } catch (e) {
    console.warn('[tokens] RefreshToken table missing — run migrations. Continuing access-token-only.');
    return { token, refreshToken: null };
  }
}

/* Consume a refresh token -> new pair (rotation). Returns {user, pair} or throws. */
async function rotate(raw) {
  if (!raw) {
    const e = new Error('Refresh token is missing.');
    e.status = 400;
    throw e;
  }
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefresh(raw) } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    const e = new Error('Session expired. Log in again.');
    e.status = 401;
    throw e;
  }
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user || user.status === 'suspended') {
    const e = new Error('Account unavailable. Log in again.');
    e.status = 401;
    throw e;
  }
  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  return { user, pair: await issuePair(user) };
}

async function revoke(raw) {
  if (!raw) return;
  try {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefresh(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (e) { /* table not migrated — nothing to revoke */ }
}

module.exports = { accessToken, issuePair, rotate, revoke, hashRefresh };
