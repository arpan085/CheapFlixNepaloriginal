const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');
const { validateReview } = require('../middleware/validate');
const { reviewUpload } = require('../middleware/upload');

// Create review (auth required)
router.post('/', authMiddleware, validateReview, reviewController.createReview);

// Add photos to your own review (auth required)
router.post('/:reviewId/photos', authMiddleware, reviewUpload, reviewController.addPhotos);

// Get reviews for a provider (public)
router.get('/provider/:providerId', reviewController.getProviderReviews);

// Get single review (public)
router.get('/:reviewId', reviewController.getReview);

// Update review (auth required)
router.put('/:reviewId', authMiddleware, reviewController.updateReview);

// Delete review (auth required)
router.delete('/:reviewId', authMiddleware, reviewController.deleteReview);

module.exports = router;
