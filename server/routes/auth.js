const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');
require('dotenv').config();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

const setTokenCookies = (res, user) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    refreshSecret,
    { expiresIn: '7d' }
  );

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });
};

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  handleValidationErrors,
  async (req, res) => {
    const { name, email, password } = req.body;

    try {
      const existing = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const result = await pool.query(
        `INSERT INTO users (name, email, password, is_verified) 
         VALUES ($1, $2, $3, true) RETURNING id, name, email`,
        [name, email, hashedPassword]
      );

      const user = result.rows[0];

      setTokenCookies(res, user);

      res.status(201).json({
        message: 'Registration successful!',
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      setTokenCookies(res, user);

      res.json({
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail()],
  handleValidationErrors,
  async (req, res) => {
    const { email } = req.body;

    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.json({
          message: 'If an account exists with that email, a password reset link has been sent.',
        });
      }

      const user = result.rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
        [hashedToken, expires, user.id]
      );

      try {
        await sendPasswordResetEmail(email, rawToken);
      } catch (emailErr) {
        console.error('Failed to send password reset email:', emailErr.message);
      }

      res.json({
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error processing password reset request' });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  handleValidationErrors,
  async (req, res) => {
    const { token, password } = req.body;

    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const result = await pool.query(
        `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
        [hashedToken]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired password reset token' });
      }

      const user = result.rows[0];
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await pool.query(
        `UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
        [hashedPassword, user.id]
      );

      res.json({
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.',
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error resetting password' });
    }
  }
);

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, refreshSecret);

    const result = await pool.query(
      'SELECT id, name, email, is_verified FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    setTokenCookies(res, user);

    res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, starting_balance, starting_balance_date FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

const profileRoutes = require('./profile');
router.use('/balance', profileRoutes);

module.exports = router;