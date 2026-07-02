const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAttemptStatus, recordFailedAttempt, clearAttempts } = require('../middleware/authAttempt');
const { logSecurityEvent } = require('../utils/securityLogger');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const getClientIp = (req) => req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
const getUserAgent = (req) => req.get('User-Agent') || 'unknown';

/* =========================
   REGISTER USER
========================= */
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      userType,
      category,
      experience,
      price,
      bio
    } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Account already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: phone ? String(phone).trim() : null,
        role: userType === 'provider' ? 'provider' : 'user',
        status: 'active'
      }
    });

    let providerId = null;

    if (userType === 'provider') {
      const provider = await prisma.provider.create({
        data: {
          userId: user.id,
          category: String(category).trim(),
          bio: bio ? String(bio).trim().slice(0, 500) : '',
          experience: Number.isInteger(Number(experience)) ? Number(experience) : 0,
          verified: false,
          rating: 0
        }
      });

      providerId = provider.id;

      await prisma.service.create({
        data: {
          providerId: provider.id,
          name: `${String(category).trim()} Services`,
          description: bio ? String(bio).trim().slice(0, 500) : `Professional ${String(category).trim()} services`,
          price: Number.isFinite(Number(price)) ? Number(price) : 0,
          duration: 60
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        providerId
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ error: 'Account already exists with this email.' });
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

/* =========================
   LOGIN USER
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const attemptStatus = await getAttemptStatus({ email: normalizedEmail, ipAddress });

    if (attemptStatus?.blockedUntil && new Date(attemptStatus.blockedUntil) > new Date()) {
      return res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      await recordFailedAttempt({ email: normalizedEmail, ipAddress, userAgent });
      logSecurityEvent('failed_login_attempt', {
        email: normalizedEmail,
        ip: ipAddress,
        userAgent,
        path: req.originalUrl
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await clearAttempts({ email: normalizedEmail, ipAddress });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

/* =========================
   LOGOUT
========================= */
exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

/* =========================
   GET CURRENT USER
========================= */
exports.getCurrentUser = async (req, res) => {
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
        role: true,
        status: true
      }
    });

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};