const prisma = require('../config/database');

/* ======================
   DASHBOARD STATS
====================== */
exports.getDashboardStats = async (req, res) => {
  try {
    const users = await prisma.user.count({ where: { role: 'user' } });
    const providers = await prisma.provider.count();
    const verifiedProviders = await prisma.provider.count({ where: { verified: true } });
    const bookings = await prisma.booking.count();

    const revenue = await prisma.booking.aggregate({
      _sum: { totalAmount: true }
    });

    try {
      const { writeAudit } = require('../utils/audit');
      await writeAudit({ actorId: String(req.user.id), actorName: 'Admin', actorRole: 'admin', targetUserId: provider.user.id, targetName: `${provider.user.firstName} ${provider.user.lastName}`, action: isVerified ? 'provider_verified' : 'provider_unverified', changes: { verified: isVerified } });
    } catch (e) {}

    res.json({
      success: true,
      data: {
        users,
        providers,
        verifiedProviders,
        bookings,
        revenue: revenue._sum.totalAmount || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================
   ANALYTICS (in-memory since restart + today's DB figures)
====================== */
exports.getAnalytics = async (req, res) => {
  try {
    const { analyticsHandler } = require('../middleware/analytics');
    res.json({ success: true, data: await analyticsHandler(prisma) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================
   CATEGORIES (free-text trades, managed by rename/merge)
====================== */
exports.getCategories = async (req, res) => {
  try {
    const groups = await prisma.provider.groupBy({
      by: ['category'],
      _count: { id: true },
      _avg: { rating: true },
      orderBy: { _count: { id: 'desc' } }
    });
    res.json({
      success: true,
      count: groups.length,
      data: groups.map((g) => ({
        name: g.category,
        providers: g._count.id,
        avgRating: g._avg.rating ? Number(g._avg.rating.toFixed(2)) : 0
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Rename (or merge, if `to` exists) a category across all providers.
exports.renameCategory = async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to || !String(from).trim() || !String(to).trim()) {
      return res.status(400).json({ error: 'Both "from" and "to" category names are required.' });
    }
    if (String(from).length > 60 || String(to).length > 60) {
      return res.status(400).json({ error: 'Category names are too long (max 60).' });
    }
    const result = await prisma.provider.updateMany({
      where: { category: String(from) },
      data: { category: String(to).trim() }
    });
    res.json({ success: true, message: `Renamed "${from}" to "${to}".`, updated: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================
   USERS
====================== */
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        address: true,
        status: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    const target = await prisma.user.findUnique({ where: { id: String(req.params.id) }, select: { id: true, role: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') return res.status(403).json({ error: 'Admin accounts require a separate protected removal process.' });
    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Admin edits any user's profile fields (name, phone, city, address, status). */
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phone, city, address, status, role } = req.body || {};
    const data = {};
    if (firstName !== undefined) data.firstName = String(firstName).slice(0, 80);
    if (lastName !== undefined) data.lastName = String(lastName).slice(0, 80);
    if (phone !== undefined) data.phone = String(phone).slice(0, 20) || null;
    if (city !== undefined) data.city = String(city).slice(0, 80) || null;
    if (address !== undefined) data.address = String(address).slice(0, 500) || null;
    if (status !== undefined) {
      if (!['active', 'inactive', 'suspended'].includes(String(status))) {
        return res.status(400).json({ error: 'Invalid status.' });
      }
      data.status = String(status);
    }
    if (role !== undefined) {
      if (!['user', 'provider'].includes(String(role))) return res.status(400).json({ error: 'Role must be user or provider.' });
      if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'You cannot change your own role.' });
      if (String(role) === 'provider') {
        const provider = await prisma.provider.findUnique({ where: { userId: String(req.params.id) }, select: { id: true } });
        if (!provider) return res.status(400).json({ error: 'Create a provider profile before assigning the provider role.' });
      }
      data.role = String(role);
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update.' });
    const before = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!before) return res.status(404).json({ error: 'User not found' });
    const user = await prisma.user.update({
      where: { id: before.id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, city: true, address: true, status: true, role: true },
    });
    try {
      const { diffFields, writeAudit } = require('../utils/audit');
      const { broadcast } = require('../utils/events');
      const changes = diffFields(before, user, ['firstName', 'lastName', 'phone', 'city', 'address', 'status', 'role']);
      const adminName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || 'Admin';
      const targetName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      await writeAudit({
        actorId: String(req.user.id), actorName: adminName, actorRole: 'admin',
        targetUserId: user.id, targetName, action: 'admin_user_updated', changes,
      });
      try { require('../routes/providerRoutes').clearCache(); } catch (e) {}
      broadcast('profile_updated', { userId: user.id, changes: Object.keys(changes), user, byAdmin: true });
    } catch (e) {}
    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* Admin resets any user's password (returns nothing secret — share the new
   password with the user over a trusted channel). */
exports.resetUserPassword = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 8 || String(password).length > 72) {
      return res.status(400).json({ error: 'New password needs 8–72 characters.' });
    }
    const target = await prisma.user.findUnique({ where: { id: String(req.params.id) }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === String(req.user.id)) {
      return res.status(400).json({ error: 'Change your own password from profile settings instead.' });
    }
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(String(password), 10);
    await prisma.user.update({ where: { id: target.id }, data: { password: hash } });
    res.json({ success: true, message: 'Password reset. Share the new password with the user securely.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================
   PROVIDERS
====================== */
exports.getAuditLog = async (req, res) => {
  try {
    const { readAudit } = require('../utils/audit');
    const out = await readAudit({
      action: req.query.action,
      search: req.query.search || req.query.q,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 30,
    });
    res.json({ success: true, ...out, data: out.rows });
  } catch (err) {
    // Table not migrated yet — return empty instead of 500 so dashboard works.
    res.json({ success: true, migrated: false, total: 0, rows: [], data: [], page: 1, totalPages: 0 });
  }
};
exports.getProviders = async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            address: true,
            status: true,
            role: true,
            createdAt: true
          }
        },
        services: true
      }
    });

    res.json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.verifyProvider = async (req, res) => {
  try {
    const { verified } = req.body;

    const isVerified = verified === true || verified === 'true';
    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: {
        verified: isVerified
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, role: true } } }
    });

    try {
      const { writeAudit } = require('../utils/audit');
      await writeAudit({
        actorId: String(req.user.id), actorName: 'Admin', actorRole: 'admin',
        targetUserId: provider.user.id,
        targetName: `${provider.user.firstName} ${provider.user.lastName}`,
        action: isVerified ? 'provider_verified' : 'provider_unverified',
        changes: { verified: isVerified }
      });
    } catch (e) {}

    res.json({
      success: true,
      message: isVerified ? 'Provider approved' : 'Provider rejected',
      data: provider
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.suspendProvider = async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await prisma.user.update({
      where: { id: provider.userId },
      data: { status: 'suspended' }
    });

    try {
      const { writeAudit } = require('../utils/audit');
      await writeAudit({ actorId: String(req.user.id), actorName: 'Admin', actorRole: 'admin', targetUserId: provider.userId, targetName: provider.userId, action: 'provider_suspended', changes: { status: 'suspended' } });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Provider suspended'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProvider = async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: String(req.params.id) }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Delete all bookings associated with this provider
    await prisma.booking.deleteMany({
      where: { providerId: String(req.params.id) }
    });

    // Delete all services of this provider
    await prisma.service.deleteMany({
      where: { providerId: String(req.params.id) }
    });

    // Delete the provider
    await prisma.provider.delete({
      where: { id: String(req.params.id) }
    });

    // Delete the associated user
    await prisma.user.delete({
      where: { id: String(provider.userId) }
    });

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================
   BOOKINGS
====================== */
exports.getBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        provider: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        service: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
      include: {
        user: true,
        provider: true,
        service: true
      }
    });

    res.json({
      success: true,
      message: 'Booking cancelled',
      data: booking
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.setUserStatus = async (req, res) => {
  try {
    const status = String((req.body || {}).status || '');
    if (!['active', 'inactive', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'You cannot suspend your own admin account.' });
    const before = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!before) return res.status(404).json({ error: 'User not found' });
    const user = await prisma.user.update({ where: { id: before.id }, data: { status }, select: { id: true, email: true, firstName: true, lastName: true, status: true, role: true } });
    try {
      const { writeAudit } = require('../utils/audit');
      await writeAudit({ actorId: String(req.user.id), actorName: 'Admin', actorRole: 'admin', targetUserId: user.id, targetName: `${user.firstName} ${user.lastName}`, action: 'admin_status_changed', changes: { status: { from: before.status, to: status } } });
    } catch (e) {}
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ error: 'Could not update user status.' }); }
};