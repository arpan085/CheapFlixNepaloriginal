const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const providerRoutes = require('./routes/providerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/notifications', notificationRoutes);

// Services endpoint (public)
const prisma = require('./config/database');
app.get('/api/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: services.length, data: services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running ✅' });
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
  