const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

// GET /api/profile/balance - Retrieve current balance baseline
router.get('/balance', auth, transactionLimiter, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, starting_balance, starting_balance_date FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    res.json({
      starting_balance: row.starting_balance !== null && row.starting_balance !== undefined ? parseFloat(row.starting_balance) : null,
      starting_balance_date: row.starting_balance_date || null,
    });
  } catch (err) {
    console.error('Error fetching balance baseline:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/profile/balance - Update baseline balance and as of date
router.put('/balance', auth, transactionLimiter, async (req, res) => {
  const { balance, date } = req.body;

  if (balance === undefined || balance === null || balance === '' || isNaN(Number(balance))) {
    return res.status(400).json({ message: 'A valid numeric balance is required' });
  }

  const numBalance = parseFloat(Number(balance).toFixed(2));

  let baselineDate;
  if (date) {
    baselineDate = new Date(date);
    if (isNaN(baselineDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
  } else {
    baselineDate = new Date();
  }

  try {
    const result = await pool.query(
      `UPDATE users 
       SET starting_balance = $1, starting_balance_date = $2 
       WHERE id = $3 
       RETURNING id, starting_balance, starting_balance_date`,
      [numBalance, baselineDate, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    res.json({
      message: 'Current balance baseline updated successfully',
      starting_balance: parseFloat(row.starting_balance),
      starting_balance_date: row.starting_balance_date,
    });
  } catch (err) {
    console.error('Error updating balance baseline:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
