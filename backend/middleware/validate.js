/* Central request validation (express-validator v7).
   Attach a chain + `handleValidation` to any route that takes user input. */
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    error: errors.array({ onlyFirstError: true })[0].msg,
  });
}

const emailRule = body('email')
  .trim().notEmpty().withMessage('Email is required.')
  .isEmail().withMessage('Enter a valid email address.')
  .isLength({ max: 254 }).withMessage('Email is too long.');

const passwordRule = body('password')
  .isString().withMessage('Password is required.')
  .isLength({ min: 8, max: 72 }).withMessage('Password needs 8–72 characters.');

const nameRule = (field, label) =>
  body(field).trim().notEmpty().withMessage(label + ' is required.')
    .isLength({ max: 80 }).withMessage(label + ' is too long.');

const validateRegister = [
  emailRule,
  passwordRule,
  nameRule('firstName', 'First name'),
  nameRule('lastName', 'Last name'),
  body('phone').optional({ checkFalsy: true }).trim()
    .matches(/^9[678]\d{8}$/).withMessage('Phone must be a Nepali mobile (98XXXXXXXX).'),
  body('city').optional({ checkFalsy: true }).trim()
    .isLength({ max: 80 }).withMessage('City is too long.'),
  body('address').optional({ checkFalsy: true }).trim()
    .isLength({ max: 500 }).withMessage('Address is too long.'),
  body('avatar').optional({ checkFalsy: true }).trim()
    .isLength({ max: 500 }).withMessage('Avatar value is too long.')
    .custom((v) => {
      if (/^data:/i.test(v)) throw new Error('Upload your photo after signing up — data URLs are not accepted here.');
      if (/^preset:#[0-9a-fA-F]{3,8}$/.test(v)) return true;
      if (/^https?:\/\/.+/i.test(v)) return true;
      if (/^\/uploads\/.+/i.test(v)) return true;
      if (/^\/api\/files\/.+/i.test(v)) return true;
      throw new Error('Invalid avatar choice.');
    }),
  body('userType').optional().isIn(['user', 'provider']).withMessage('Invalid account type.'),
  body('experience').optional().isInt({ min: 0, max: 60 }).withMessage('Experience must be 0–60 years.'),
  body('price').optional().isFloat({ min: 0, max: 1000000 }).withMessage('Price looks invalid.'),
  handleValidation,
];

const validateLogin = [emailRule, body('password').notEmpty().withMessage('Password is required.'), handleValidation];

const validateForgot = [emailRule, handleValidation];

const validateReset = [
  body('token').notEmpty().withMessage('Reset token is missing.'),
  passwordRule,
  handleValidation,
];

const validateBookingCreate = [
  body('providerId').notEmpty().withMessage('Choose a provider.'),
  body('serviceId').notEmpty().withMessage('Choose a service.'),
  body('date').notEmpty().withMessage('Pick a date.').isISO8601().withMessage('Invalid date.'),
  body('startTime').trim().notEmpty().withMessage('Pick a start time.').isLength({ max: 40 }),
  body('duration').trim().notEmpty().withMessage('Pick a duration.').isLength({ max: 40 }),
  body('totalAmount').isFloat({ min: 0, max: 10000000 }).withMessage('Invalid total amount.'),
  body('location').optional().isLength({ max: 500 }).withMessage('Address is too long.'),
  body('notes').optional().isLength({ max: 2000 }).withMessage('Notes are too long.'),
  body('paymentMethod').optional().isIn(['cash', 'esewa', 'khalti', 'bank']).withMessage('Invalid payment method.'),
  handleValidation,
];

const validateChatSend = [
  body('bookingId').notEmpty().withMessage('Booking is required.'),
  body('receiverId').notEmpty().withMessage('Recipient is required.'),
  body('text').optional().isLength({ max: 2000 }).withMessage('Message is too long (max 2000 chars).'),
  body('attachment').optional().isLength({ max: 500 }).withMessage('Attachment URL is too long.'),
  handleValidation,
];

const validateReview = [
  body('bookingId').notEmpty().withMessage('Booking is required.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5 stars.'),
  body('comment').optional().isLength({ max: 2000 }).withMessage('Review is too long.'),
  handleValidation,
];

const validateTicket = [
  body('title').trim().notEmpty().withMessage('Subject is required.').isLength({ max: 160 }),
  body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 8000 }),
  body('category').optional().isIn(['booking', 'payment', 'bug', 'feedback', 'dispute', 'other']).withMessage('Invalid topic.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  handleValidation,
];

module.exports = {
  handleValidation,
  // Alias used by the security-hardening routes: same 400 contract shape
  // they expect ({ error, details }) while reusing the chain above.
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({
      error: 'Invalid input',
      details: errors.array().map((err) => ({ field: err.param, message: err.msg })),
    });
  },
  validateRegister,
  validateLogin,
  validateForgot,
  validateReset,
  validateBookingCreate,
  validateChatSend,
  validateReview,
  validateTicket,
};
