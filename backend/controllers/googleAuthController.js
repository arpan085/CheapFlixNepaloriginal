const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/database');

// Google OAuth client ID comes ONLY from env (no hardcoded fallback —
// a leaked client ID lets attackers mint phishing login buttons).
function googleClient() {
  const id = process.env.GOOGLE_CLIENT_ID || '';
  if (!id) {
    const e = new Error('Google login is not configured (set GOOGLE_CLIENT_ID).');
    e.status = 503;
    throw e;
  }
  return { client: new OAuth2Client(id), id };
}

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
    const { client, id } = googleClient();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: id,
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

    // Generate access + refresh pair
    const { issuePair } = require('../utils/tokens');
    const pair = await issuePair(user);

    return res.json({
      success: true,
      token: pair.token,
      refreshToken: pair.refreshToken,
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
