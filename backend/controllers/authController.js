const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      city,
      address,
      avatar,
      userType,
      category,
      experience,
      price,
      bio
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Server-side password policy (mirrors route validation — never trust the client alone)
    if (String(password).length < 8 || String(password).length > 72) {
      return res.status(400).json({ error: 'Password needs 8–72 characters.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Avatar at signup is either a "preset:#hex" default choice (persists as
    // the permanent profile until changed) or null = initials fallback.
    // Uploaded photos are saved right after signup via POST /users/avatar.
    let signupAvatar = null;
    if (typeof avatar === 'string') {
      const a = avatar.trim().slice(0, 500);
      if (/^preset:#[0-9a-fA-F]{3,8}$/.test(a)) signupAvatar = a;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        city: (typeof city === 'string' && city.trim()) ? city.trim().slice(0, 80) : null,
        address: (typeof address === 'string' && address.trim()) ? address.trim().slice(0, 500) : null,
        avatar: signupAvatar,
        role: userType === 'provider' ? 'provider' : 'user',
        status: 'active'
      }
    });

    let providerId = null;

    if (userType === 'provider') {
      if (!category) {
        return res.status(400).json({ error: 'Service category is required for providers' });
      }
      const expYears = experience === undefined || experience === '' ? 0 : parseInt(experience, 10);
      if (Number.isNaN(expYears) || expYears < 0) {
        return res.status(400).json({ error: 'Experience must be a valid number of years' });
      }
      const provider = await prisma.provider.create({
        data: {
          userId: user.id,
          category: String(category).trim(),
          bio: bio || '',
          experience: expYears,
          verified: false,
          rating: 0
        }
      });

      providerId = provider.id;

      await prisma.service.create({
        data: {
          providerId: provider.id,
          name: `${category} Services`,
          description: bio || `Professional ${category} services`,
          price: parseFloat(price || 0),
          duration: 60
        }
      });

      // Put provider applications in the admin notification stream.
      const admins = await prisma.user.findMany({
        where: { role: 'admin', status: 'active' },
        select: { id: true }
      });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            bookingId: null,
            providerId: provider.id,
            userId: admin.id,
            type: 'provider_application',
            title: 'New provider application',
            message: `${user.firstName} ${user.lastName} applied as a ${provider.category}. Review their profile and documents.`,
            status: 'unread',
            action: 'review_provider'
          }))
        });
      }
    }

    const { issuePair } = require('../utils/tokens');
    const pair = await issuePair(user);

    res.status(201).json({
      message: 'User registered successfully',
      token: pair.token,
      refreshToken: pair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        city: user.city,
        address: user.address,
        avatar: user.avatar,
        role: user.role,
        providerId
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================
   LOGIN USER
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { issuePair } = require('../utils/tokens');
    const pair = await issuePair(user);

    res.status(200).json({
      message: 'Login successful',
      token: pair.token,
      refreshToken: pair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        city: user.city,
        address: user.address,
        avatar: user.avatar,
        role: user.role,
        providerId: user.role === 'provider' ? (await prisma.provider.findUnique({ where: { userId: user.id }, select: { id: true } }))?.id : null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================
   LOGOUT — revokes the refresh token when the client sends one,
   so a stolen refresh token dies on logout.
========================= */
exports.logout = async (req, res) => {
  try {
    const { revoke } = require('../utils/tokens');
    await revoke(req.body && req.body.refreshToken);
  } catch (e) { /* never fail logout */ }
  res.status(200).json({ message: 'Logout successful' });
};

/* =========================
   REFRESH — swap a refresh token for a new pair (rotated).
========================= */
exports.refresh = async (req, res) => {
  try {
    const { rotate } = require('../utils/tokens');
    const { user, pair } = await rotate(req.body && req.body.refreshToken);
    return res.json({
      token: pair.token,
      refreshToken: pair.refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Could not refresh session' });
  }
};

/* =========================
   FORGOT PASSWORD — request a reset link
   Stateless: signed JWT (purpose=password-reset, 15 min).
   No new dependency: plugging nodemailer/SMTP later only
   touches sendResetMail() below.
========================= */
async function sendResetMail(user, link) {
  // Resend HTTP API when RESEND_API_KEY exists, else server log.
  // Outside production the link is also returned in the API response
  // so the flow stays testable end-to-end.
  const { sendMail, resetTemplate } = require('../utils/mailer');
  const tpl = resetTemplate({ name: user.firstName, link });
  try {
    await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html });
  } catch (e) {
    console.error('[auth] reset mail failed, link logged instead:', link);
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/.+@.+\..+/.test(String(email))) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    const done = { message: 'If that email is registered, a reset link is on its way (valid 15 minutes).' };
    const user = await prisma.user.findUnique({ where: { email: String(email).trim() } });
    if (!user) return res.json(done); // don't reveal which emails exist

    const token = jwt.sign(
      { id: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const front = process.env.FRONTEND_URL || '';
    const link = (front ? front.replace(/\/$/, '') : '') + '/pages/reset.html?token=' + token;
    await sendResetMail(user, link);

    if (process.env.NODE_ENV !== 'production') {
      done.devResetLink = link;
      done.devToken = token;
    }
    return res.json(done);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Could not process the request. Try again.' });
  }
};

/* =========================
   RESET PASSWORD — consume the token
========================= */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token) return res.status(400).json({ error: 'Reset token is missing.' });
    if (!password || String(password).length < 8 || String(password).length > 72) {
      return res.status(400).json({ error: 'Password needs 8–72 characters.' });
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' });
    }
    if (!payload || payload.purpose !== 'password-reset' || !payload.id) {
      return res.status(400).json({ error: 'This reset link is invalid. Request a new one.' });
    }
    const hashed = await bcrypt.hash(String(password), 10);
    await prisma.user.update({ where: { id: String(payload.id) }, data: { password: hashed } });
    return res.json({ message: 'Password updated. Log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Could not reset the password. Try again.' });
  }
};

/* =========================
   PHONE OTP LOGIN (Sparrow SMS)
   POST /auth/otp-request { phone } — 6-digit code, 5-min TTL.
   POST /auth/otp-verify { phone, code } — returns token pair.
   Only existing accounts (phone on file) can use OTP; new users
   register with email first, then add their phone in profile.
========================= */
const crypto = require('crypto');

function otpHash(code, phone) {
  return crypto.createHash('sha256').update(`otp:${phone}:${code}`).digest('hex');
}
function validPhone(phone) {
  return /^9[678]\d{8}$/.test(String(phone || '').replace(/[\s-]/g, ''));
}

exports.requestOtp = async (req, res) => {
  try {
    const phone = String(req.body.phone || '').replace(/[\s-]/g, '');
    if (!validPhone(phone)) return res.status(400).json({ error: 'Enter a Nepali mobile (98XXXXXXXX).' });
    const user = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'No account uses this number yet — register first.' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    try {
      await prisma.otpCode.upsert({
        where: { phone },
        update: { codeHash: otpHash(code, phone), expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 },
        create: { phone, codeHash: otpHash(code, phone), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
    } catch (e) {
      return res.status(500).json({ error: 'OTP is not set up yet — run database migrations.' });
    }
    const { sendSms } = require('../utils/sms');
    try {
      await sendSms({ to: phone, text: `Cheapflix code: ${code}. Valid 5 minutes. Never share it.` });
    } catch (e) {
      return res.status(502).json({ error: 'Could not send SMS. Try again.' });
    }
    const out = { message: 'Code sent — valid 5 minutes.' };
    if (process.env.NODE_ENV !== 'production' && !process.env.SPARROW_SMS_TOKEN) out.devCode = code;
    return res.json(out);
  } catch (error) {
    console.error('OTP request error:', error);
    return res.status(500).json({ error: 'Could not send code. Try again.' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const phone = String(req.body.phone || '').replace(/[\s-]/g, '');
    const code = String(req.body.code || '').trim();
    if (!validPhone(phone) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit code.' });
    }
    const row = await prisma.otpCode.findUnique({ where: { phone } });
    if (!row) return res.status(400).json({ error: 'No code was requested for this number.' });
    if (row.expiresAt < new Date() || row.attempts >= 5) {
      try { await prisma.otpCode.delete({ where: { phone } }); } catch (e) {}
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    const ok = crypto.timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(otpHash(code, phone)));
    if (!ok) {
      await prisma.otpCode.update({ where: { phone }, data: { attempts: row.attempts + 1 } });
      return res.status(401).json({ error: 'Wrong code. Try again.' });
    }
    await prisma.otpCode.delete({ where: { phone } });
    const user = await prisma.user.findFirst({
      where: { phone },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });
    if (!user || user.status === 'suspended') return res.status(403).json({ error: 'Account unavailable.' });
    const { issuePair } = require('../utils/tokens');
    const pair = await issuePair(user);
    return res.json({
      message: 'Login successful', token: pair.token, refreshToken: pair.refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return res.status(500).json({ error: 'Could not verify code. Try again.' });
  }
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
        avatar: true,
        role: true,
        status: true,
        provider: { select: { id: true } },
      }
    });

    res.status(200).json(user && user.provider
      ? { ...user, providerId: user.provider.id }
      : user);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};