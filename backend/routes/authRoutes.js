const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const { authMiddleware } = require('../middleware/auth');
const { registerLimiter, loginLimiter, authLimiter, loginSlowDown } = require('../middleware/rateLimiter');
const { handleValidationErrors } = require('../middleware/validate');

const emailValidator = body('email').isEmail().withMessage('Valid email is required').normalizeEmail();
const passwordValidator = body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters');
const nameValidator = body('firstName').trim().notEmpty().withMessage('First name is required');
const lastNameValidator = body('lastName').trim().notEmpty().withMessage('Last name is required');

router.post('/register', registerLimiter, [emailValidator, passwordValidator, nameValidator, lastNameValidator], handleValidationErrors, authController.register);
router.post('/login', loginLimiter, loginSlowDown, [emailValidator, passwordValidator], handleValidationErrors, authController.login);
router.post('/logout', authLimiter, authController.logout);
router.post('/google', authLimiter, googleAuthController.googleAuth);
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
