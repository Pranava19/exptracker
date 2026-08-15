const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');

const validateTransaction = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
];

router.post('/', auth, validateTransaction, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { type, category, amount, description, date, mode } = req.body;
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, category, amount, description, date, mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, type, category, amount, description, date, mode || 'Other']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/summary', auth, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
       FROM transactions WHERE user_id = $1`,
      [user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/duplicates', auth, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id NOT IN (
         SELECT MIN(id)
         FROM transactions
         WHERE user_id = $1
         GROUP BY user_id, date, amount, description, type
       )
       AND user_id = $1`,
      [user_id]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  const user_id = req.user.id;
  const { type, category, start_date, end_date } = req.query;
  try {
    let query = `SELECT * FROM transactions WHERE user_id = $1`;
    let params = [user_id];
    let index = 2;
    if (type) { query += ` AND type = $${index}`; params.push(type); index++; }
    if (category) { query += ` AND category = $${index}`; params.push(category); index++; }
    if (start_date) { query += ` AND date >= $${index}`; params.push(start_date); index++; }
    if (end_date) { query += ` AND date <= $${index}`; params.push(end_date); index++; }
    query += ` ORDER BY date DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, validateTransaction, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { id } = req.params;
  const { type, category, amount, description, date, mode } = req.body;
  const user_id = req.user.id;
  try {
    const check = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, user_id]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: 'Transaction not found' });
    const result = await pool.query(
      `UPDATE transactions SET type=$1, category=$2, amount=$3, description=$4, date=$5, mode=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [type, category, amount, description, date, mode || 'Other', id, user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { category, mode } = req.body;
  const user_id = req.user.id;
  try {
    const check = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, user_id]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: 'Transaction not found' });
    const result = await pool.query(
      `UPDATE transactions SET category=$1, mode=$2 WHERE id=$3 AND user_id=$4 RETURNING *`,
      [category, mode, id, user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try {
    const check = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, user_id]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: 'Transaction not found' });
    await pool.query('DELETE FROM transactions WHERE id=$1 AND user_id=$2', [id, user_id]);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/import', auth, async (req, res) => {
  const { transactions } = req.body;
  const user_id = req.user.id;
  try {
    const inserted = [];
    for (const tx of transactions) {
      const result = await pool.query(
        `INSERT INTO transactions (user_id, type, category, amount, description, date, mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [user_id, tx.type, tx.category, tx.amount, tx.description, tx.date, tx.mode]
      );
      inserted.push(result.rows[0]);
    }
    res.status(201).json({ count: inserted.length, transactions: inserted });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;