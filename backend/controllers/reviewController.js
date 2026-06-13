const prisma = require('../config/database');

// Create a review for a completed booking
exports.createReview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'Missing required fields: bookingId, rating' });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Check if booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: String(bookingId) }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden - booking does not belong to user' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { bookingId: String(bookingId) }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this booking' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId: String(bookingId),
        userId: String(req.user.id),
        providerId: booking.providerId,
        rating: Number(rating),
        comment: comment || null
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        provider: { select: { id: true } }
      }
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get reviews for a provider
exports.getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { providerId: String(providerId) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        booking: { select: { id: true, date: true, service: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    return res.json({ 
      success: true, 
      count: reviews.length, 
      averageRating: parseFloat(avgRating),
      data: reviews 
    });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Get single review
exports.getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: String(reviewId) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        provider: { select: { id: true } },
        booking: { select: { id: true, date: true } }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json({ success: true, data: review });
  } catch (error) {
    console.error('Get review error:', error);
    return res.status(500).json({ error: 'Failed to fetch review' });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: String(reviewId) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden - you can only update your own reviews' });
    }

    if (rating && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const updated = await prisma.review.update({
      where: { id: String(reviewId) },
      data: {
        rating: rating ? Number(rating) : undefined,
        comment: comment !== undefined ? comment : undefined
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        provider: { select: { id: true } }
      }
    });

    return res.json({ success: true, message: 'Review updated', data: updated });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: String(reviewId) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden - you can only delete your own reviews' });
    }

    await prisma.review.delete({
      where: { id: String(reviewId) }
    });

    return res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
};
