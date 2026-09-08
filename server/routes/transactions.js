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

const analysisRoutes = require('./analysis');
router.use(['/summary_cards', '/summary-cards', '/monthly_breakdown', '/monthly-summary', '/monthly_summary', '/cashflow', '/net-cashflow', '/net_cashflow', '/daily_expenses', '/daily-expenses', '/recent_transactions', '/recent-transactions', '/top-transactions', '/top_transactions'], analysisRoutes);

router.delete('/duplicates', auth, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id NOT IN (
         SELECT MIN(id)
         FROM transactions
         WHERE user_id = $1
         GROUP BY user_id, date, amount, type, LOWER(TRIM(COALESCE(description, ''))), LOWER(TRIM(COALESCE(payee, '')))
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
  const { type, category, start_date, end_date, limit, cursorDate, cursorId, cursor_date, cursor_id, offset, page } = req.query;
  try {
    let whereClause = `WHERE user_id = $1`;
    let params = [user_id];
    let index = 2;

    if (type) { whereClause += ` AND type = $${index}`; params.push(type); index++; }
    if (category) { whereClause += ` AND category = $${index}`; params.push(category); index++; }
    if (start_date) { whereClause += ` AND date >= $${index}`; params.push(start_date); index++; }
    if (end_date) { whereClause += ` AND date <= $${index}`; params.push(end_date); index++; }

    const cDate = cursorDate || cursor_date;
    const cId = cursorId || cursor_id;
    const isPaginated = cDate !== undefined || cId !== undefined || limit !== undefined || offset !== undefined || page !== undefined;

    if (isPaginated) {
      const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

      if (cDate && cId) {
        whereClause += ` AND (date, id) < ($${index}, $${index + 1})`;
        params.push(cDate, parseInt(cId, 10));
        index += 2;
      }

      const dataQuery = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, id DESC LIMIT $${index}`;
      params.push(parsedLimit + 1);

      const result = await pool.query(dataQuery, params);
      const hasNextPage = result.rows.length > parsedLimit;
      const rows = hasNextPage ? result.rows.slice(0, parsedLimit) : result.rows;

      const lastItem = rows[rows.length - 1];
      const nextCursor = hasNextPage && lastItem ? {
        cursorDate: lastItem.date instanceof Date ? lastItem.date.toISOString().slice(0, 10) : String(lastItem.date).slice(0, 10),
        cursorId: lastItem.id,
      } : null;

      return res.json({
        transactions: rows,
        pagination: {
          limit: parsedLimit,
          hasNextPage,
          nextCursor,
        },
      });
    }

    const dataQuery = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, id DESC`;
    const result = await pool.query(dataQuery, params);
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
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const inserted = [];
    for (const tx of transactions) {
      const result = await client.query(
        `INSERT INTO transactions (user_id, type, category, amount, description, date, mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [user_id, tx.type, tx.category, tx.amount, tx.description, tx.date, tx.mode]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ count: inserted.length, transactions: inserted });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error('Rollback error:', rbErr.message); }
    }
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;