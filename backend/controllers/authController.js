const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, userType, category, experience, price, bio } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: userType === 'provider' ? 'provider' : 'user',
      },
    });

    // ✅ CREATE PROVIDER PROFILE IF PROVIDER
    let providerId = null;
    if (userType === 'provider') {
      if (!category || !price) {
        return res.status(400).json({ error: 'Category and price are required for providers' });
      }

      const provider = await prisma.provider.create({
        data: {
          userId: user.id,
          category,
          bio: bio || '',
          experience: experience || 0,
          verified: false,
          rating: 0,
        },
      });

      providerId = provider.id;

      // ✅ CREATE DEFAULT SERVICE FOR PROVIDER (USE ACTUAL PROVIDER ID)
      await prisma.service.create({
        data: {
          providerId: provider.id,
          name: `${category} Services`,
          description: bio || `Professional ${category} services`,
          price: parseFloat(price),
          duration: 60,
        },
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        category: userType === 'provider' ? category : undefined,
        providerId: providerId,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout (optional - mostly handled on frontend)
exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

// Get current user
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
        role: true,
        status: true,
        avatar: true,
      },
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
