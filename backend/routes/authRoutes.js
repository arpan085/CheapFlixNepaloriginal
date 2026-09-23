const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const { authMiddleware } = require('../middleware/auth');
const { validateRegister, validateLogin, validateForgot, validateReset, handleValidation } = require('../middleware/validate');
const { authLimiter, loginLimiter, otpLimiter } = require('../middleware/security');

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot', authLimiter, validateForgot, authController.forgotPassword);
router.post('/reset', authLimiter, validateReset, authController.resetPassword);
router.post('/otp-request', otpLimiter, [
  body('phone').trim().notEmpty().withMessage('Phone is required.').isLength({ max: 20 }),
  handleValidation,
], authController.requestOtp);
router.post('/otp-verify', loginLimiter, [
  body('phone').trim().notEmpty().withMessage('Phone is required.'),
  body('code').trim().notEmpty().withMessage('Code is required.').isLength({ min: 6, max: 6 }),
  handleValidation,
], authController.verifyOtp);
router.post('/google', authLimiter, googleAuthController.googleAuth);
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
