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
    await prisma.user.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================
   PROVIDERS
====================== */
exports.getProviders = async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        user: true,
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

    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: {
        verified: verified === true || verified === 'true'
      },
      include: { user: true }
    });

    res.json({
      success: true,
      message: verified ? 'Provider approved' : 'Provider rejected',
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