const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../config/database');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, city, avatar } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        avatar: avatar || undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true
      }
    });
    
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (admin only - will be checked by frontend)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        role: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
