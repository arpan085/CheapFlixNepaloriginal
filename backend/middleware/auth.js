const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 FIX: FORCE STRING ID (CRITICAL FOR PRISMA)
    req.user = {
      id: String(decoded.id),
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const providerMiddleware = (req, res, next) => {
  if (req.user.role !== 'provider' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Provider access required' });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  providerMiddleware,
};