const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// Initialize Google OAuth client
// Note: Replace with your actual Google OAuth Client ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '853879806498-tq527v089a46p1l6bmhg4iov1ufoeeaf.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verify Google token and authenticate user
 * If user doesn't exist, create new user with Google data
 */
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const firstName = payload.given_name || 'User';
    const lastName = payload.family_name || '';

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // If user doesn't exist, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          password: '', // No password for OAuth users
          role: 'user',
          status: 'active'
        }
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
};
