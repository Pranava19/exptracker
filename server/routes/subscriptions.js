const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

const validateSubscription = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Subscription name is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('frequency').optional().isIn(['monthly', 'yearly', 'weekly']).withMessage('Frequency must be monthly, yearly, or weekly'),
  body('due_date').optional().isInt({ min: 1, max: 31 }).withMessage('Due date must be between 1 and 31'),
  body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),
  body('payment_mode').optional().isIn(['UPI', 'Card', 'Cash', 'Net Banking', 'Other']).withMessage('Invalid payment mode'),
  body('status').optional().isIn(['active', 'paused', 'cancelled']).withMessage('Invalid status'),
];

// GET /api/subscriptions - List all subscriptions for user
router.get('/', auth, transactionLimiter, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.withUserTransaction(userId, async (client) => {
      return client.query(
        'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY status ASC, due_date ASC, id ASC',
        [userId]
      );
    });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching subscriptions:', err.message);
    res.status(500).json({ message: 'Server error fetching subscriptions' });
  }
});

// POST /api/subscriptions - Create new subscription
router.post('/', auth, transactionLimiter, validateSubscription, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, amount, frequency = 'monthly', due_date = 1, category = 'Bills & Utilities', payment_mode = 'UPI', status = 'active' } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.withUserTransaction(userId, async (client) => {
      return client.query(
        `INSERT INTO subscriptions (user_id, name, amount, frequency, due_date, category, payment_mode, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, name, amount, frequency, due_date, category, payment_mode, status]
      );
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating subscription:', err.message);
    res.status(500).json({ message: 'Server error creating subscription' });
  }
});

// PUT /api/subscriptions/:id - Update subscription
router.put('/:id', auth, transactionLimiter, validateSubscription, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const subId = parseInt(req.params.id, 10);
  if (isNaN(subId)) {
    return res.status(400).json({ message: 'Invalid subscription ID' });
  }

  const { name, amount, frequency = 'monthly', due_date = 1, category = 'Bills & Utilities', payment_mode = 'UPI', status = 'active' } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.withUserTransaction(userId, async (client) => {
      return client.query(
        `UPDATE subscriptions
         SET name = $1, amount = $2, frequency = $3, due_date = $4, category = $5, payment_mode = $6, status = $7
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [name, amount, frequency, due_date, category, payment_mode, status, subId, userId]
      );
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating subscription:', err.message);
    res.status(500).json({ message: 'Server error updating subscription' });
  }
});

// DELETE /api/subscriptions/:id - Delete subscription
router.delete('/:id', auth, transactionLimiter, async (req, res) => {
  const subId = parseInt(req.params.id, 10);
  if (isNaN(subId)) {
    return res.status(400).json({ message: 'Invalid subscription ID' });
  }

  const userId = req.user.id;
  try {
    const result = await pool.withUserTransaction(userId, async (client) => {
      return client.query(
        'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2 RETURNING id',
        [subId, userId]
      );
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.json({ message: 'Subscription deleted successfully' });
  } catch (err) {
    console.error('Error deleting subscription:', err.message);
    res.status(500).json({ message: 'Server error deleting subscription' });
  }
});

// POST /api/subscriptions/:id/log-payment - Record payment of this subscription as an expense transaction
router.post('/:id/log-payment', auth, transactionLimiter, async (req, res) => {
  const subId = parseInt(req.params.id, 10);
  if (isNaN(subId)) {
    return res.status(400).json({ message: 'Invalid subscription ID' });
  }

  const userId = req.user.id;
  const paymentDate = req.body.date ? new Date(req.body.date) : new Date();

  try {
    const tx = await pool.withUserTransaction(userId, async (client) => {
      const subRes = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2',
        [subId, userId]
      );

      if (subRes.rows.length === 0) {
        throw new Error('SUBSCRIPTION_NOT_FOUND');
      }

      const sub = subRes.rows[0];
      const desc = `Subscription: ${sub.name}`;
      const cat = sub.category || 'Bills & Utilities';
      const mode = sub.payment_mode || 'UPI';

      const insertRes = await client.query(
        `INSERT INTO transactions (user_id, type, category, amount, description, payee, date, mode)
         VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, cat, sub.amount, desc, sub.name, paymentDate, mode]
      );

      return insertRes.rows[0];
    });

    res.status(201).json({
      message: 'Subscription payment logged as transaction',
      transaction: tx,
    });
  } catch (err) {
    if (err.message === 'SUBSCRIPTION_NOT_FOUND') {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    console.error('Error logging subscription payment:', err.message);
    res.status(500).json({ message: 'Server error logging payment' });
  }
});

module.exports = router;
