const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { logSecurityEvent } = require('../utils/securityLogger');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    logSecurityEvent('rate_limit_violation', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      limit: 200,
      windowMs: 15 * 60 * 1000
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication requests, please wait before trying again.' },
  handler: (req, res) => {
    logSecurityEvent('auth_rate_limit_violation', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      limit: 30,
      windowMs: 15 * 60 * 1000
    });
    res.status(429).json({ error: 'Too many authentication requests. Please wait before trying again.' });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  handler: (req, res) => {
    logSecurityEvent('login_rate_limit_violation', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email || null,
      limit: 5,
      windowMs: 15 * 60 * 1000
    });
    res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please wait before trying again.' },
  handler: (req, res) => {
    logSecurityEvent('register_rate_limit_violation', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email || null,
      limit: 3,
      windowMs: 15 * 60 * 1000
    });
    res.status(429).json({ error: 'Too many registration attempts. Please wait before trying again.' });
  }
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please wait and try again later.' },
  handler: (req, res) => {
    logSecurityEvent('password_reset_rate_limit_violation', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body.email || null,
      limit: 5,
      windowMs: 15 * 60 * 1000
    });
    res.status(429).json({ error: 'Too many password reset requests. Please wait and try again later.' });
  }
});

const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: 500,
  maxDelay: 2000
});

module.exports = {
  generalLimiter,
  authLimiter,
  loginLimiter,
  registerLimiter,
  resetLimiter,
  loginSlowDown
};