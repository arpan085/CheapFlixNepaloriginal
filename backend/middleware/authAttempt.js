const prisma = require('../config/database');
const { logSecurityEvent } = require('../utils/securityLogger');

const getAttemptKey = ({ email, ipAddress, userAgent }) => ({
  email: email ? email.toLowerCase().trim() : null,
  ipAddress: ipAddress || null,
  userAgent: userAgent || null
});

const recordFailedAttempt = async ({ email, ipAddress, userAgent }) => {
  const key = getAttemptKey({ email, ipAddress, userAgent });
  const existing = await prisma.authAttempt.findFirst({
    where: { email: key.email, ipAddress: key.ipAddress }
  });

  if (existing) {
    const updated = await prisma.authAttempt.update({
      where: { id: existing.id },
      data: {
        failedCount: { increment: 1 },
        lastFailedAt: new Date(),
        blockedUntil: existing.failedCount + 1 >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : existing.blockedUntil
      }
    });

    if (updated.failedCount >= 3) {
      logSecurityEvent('suspicious_login_activity', {
        email: key.email,
        ip: key.ipAddress,
        userAgent: key.userAgent,
        failedCount: updated.failedCount
      });
    }

    return updated;
  }

  const created = await prisma.authAttempt.create({
    data: {
      email: key.email,
      ipAddress: key.ipAddress,
      userAgent: key.userAgent,
      failedCount: 1,
      lastFailedAt: new Date()
    }
  });

  return created;
};

const clearAttempts = async ({ email, ipAddress }) => {
  await prisma.authAttempt.deleteMany({
    where: {
      OR: [
        { email: email ? email.toLowerCase().trim() : null },
        { ipAddress: ipAddress || null }
      ]
    }
  });
};

const getAttemptStatus = async ({ email, ipAddress }) => {
  const existing = await prisma.authAttempt.findFirst({
    where: {
      OR: [
        { email: email ? email.toLowerCase().trim() : null },
        { ipAddress: ipAddress || null }
      ]
    }
  });

  if (!existing) return null;
  if (existing.blockedUntil && existing.blockedUntil > new Date()) {
    return { blockedUntil: existing.blockedUntil, failedCount: existing.failedCount };
  }
  return { failedCount: existing.failedCount };
};

module.exports = {
  getAttemptStatus,
  recordFailedAttempt,
  clearAttempts
};