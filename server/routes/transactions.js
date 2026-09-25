const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

const validateTransaction = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
];

const validatePatch = [
  body('category').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category must be between 1 and 100 characters'),
  body('mode').optional().isIn(['UPI', 'Card', 'Cash', 'Net Banking', 'Other']).withMessage('Invalid payment mode'),
];

const { cleanPayeeAndCategory } = require('../utils/payeeCleaner');

// Ensure authentication runs first so rateLimiter can identify the user by req.user.id
router.use(auth);
router.use(transactionLimiter);

router.post('/', validateTransaction, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { type, category, amount, description, date, mode, payee: reqPayee } = req.body;
  const user_id = req.user.id;
  const cleaned = cleanPayeeAndCategory(description || reqPayee, category);
  const finalPayee = reqPayee || cleaned.payee;
  const finalCategory = category || cleaned.category;
  const finalType = type || cleaned.type || 'expense';

  try {
    const result = await pool.withUserTransaction(user_id, async (client) => {
      return client.query(
        `INSERT INTO transactions (user_id, type, category, amount, description, payee, date, mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [user_id, finalType, finalCategory, amount, description, finalPayee, date, mode || 'Other']
      );
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (
      err.code === '23505' ||
      err.message?.includes('duplicate key') ||
      err.message?.includes('unique constraint') ||
      err.constraint?.includes('idx_transactions_dedup_hash')
    ) {
      return res.status(409).json({ message: 'Duplicate transaction already exists' });
    }
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/summary', auth, transactionLimiter, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.withUserTransaction(user_id, async (client) => {
      const userRes = await client.query(
        'SELECT starting_balance, starting_balance_date FROM users WHERE id = $1',
        [user_id]
      );
      const user = userRes.rows[0] || {};

      const txRes = await client.query(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS all_time_balance
         FROM transactions WHERE user_id = $1`,
        [user_id]
      );

      const txRow = txRes.rows[0] || {};
      const total_income = parseFloat(txRow.total_income || 0);
      const total_expense = parseFloat(txRow.total_expense || 0);
      let balance = parseFloat(txRow.all_time_balance || 0);

      // If starting_balance is set, Available Balance = starting_balance + SUM(where date >= starting_balance_date)
      if (user.starting_balance !== null && user.starting_balance !== undefined) {
        const baselineNetRes = await client.query(
          `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_since_baseline
           FROM transactions
           WHERE user_id = $1
             AND date >= $2::date`,
          [user_id, user.starting_balance_date || new Date(0)]
        );
        const netSinceBaseline = parseFloat(baselineNetRes.rows[0]?.net_since_baseline || 0);
        balance = parseFloat(user.starting_balance) + netSinceBaseline;
      }

      return {
        total_income,
        total_expense,
        balance,
        starting_balance: user.starting_balance !== null && user.starting_balance !== undefined ? parseFloat(user.starting_balance) : null,
        starting_balance_date: user.starting_balance_date || null,
      };
    });
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

const analysisRoutes = require('./analysis');
router.use(['/summary_cards', '/summary-cards', '/monthly_breakdown', '/monthly-summary', '/monthly_summary', '/cashflow', '/net-cashflow', '/net_cashflow', '/daily_expenses', '/daily-expenses', '/recent_transactions', '/recent-transactions', '/top-transactions', '/top_transactions'], analysisRoutes);

router.delete('/duplicates', auth, transactionLimiter, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.withUserTransaction(user_id, async (client) => {
      return client.query(
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
    });
    res.json({ deleted: result.rowCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, transactionLimiter, async (req, res) => {
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

    const data = await pool.withUserTransaction(user_id, async (client) => {
      if (isPaginated) {
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

        if (cDate && cId) {
          whereClause += ` AND (date, id) < ($${index}, $${index + 1})`;
          params.push(cDate, parseInt(cId, 10));
          index += 2;
        }

        const dataQuery = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, id DESC LIMIT $${index}`;
        params.push(parsedLimit + 1);

        const result = await client.query(dataQuery, params);
        const hasNextPage = result.rows.length > parsedLimit;
        const rows = hasNextPage ? result.rows.slice(0, parsedLimit) : result.rows;

        const lastItem = rows[rows.length - 1];
        const nextCursor = hasNextPage && lastItem ? {
          cursorDate: lastItem.date instanceof Date ? lastItem.date.toISOString().slice(0, 10) : String(lastItem.date).slice(0, 10),
          cursorId: lastItem.id,
        } : null;

        return {
          transactions: rows,
          pagination: {
            limit: parsedLimit,
            hasNextPage,
            nextCursor,
          },
        };
      }

      const dataQuery = `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, id DESC`;
      const result = await client.query(dataQuery, params);
      return result.rows;
    });

    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, transactionLimiter, validateTransaction, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { id } = req.params;
  const { type, category, amount, description, date, mode } = req.body;
  const user_id = req.user.id;
  try {
    const updated = await pool.withUserTransaction(user_id, async (client) => {
      const check = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, user_id]
      );
      if (check.rows.length === 0) return null;
      const result = await client.query(
        `UPDATE transactions SET type=$1, category=$2, amount=$3, description=$4, date=$5, mode=$6
         WHERE id=$7 AND user_id=$8 RETURNING *`,
        [type, category, amount, description, date, mode || 'Other', id, user_id]
      );
      return result.rows[0];
    });

    if (!updated) return res.status(404).json({ message: 'Transaction not found' });
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', auth, transactionLimiter, validatePatch, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { id } = req.params;
  const { category, mode } = req.body;
  const user_id = req.user.id;
  try {
    const updated = await pool.withUserTransaction(user_id, async (client) => {
      const check = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, user_id]
      );
      if (check.rows.length === 0) return null;
      const result = await client.query(
        `UPDATE transactions SET category=$1, mode=$2 WHERE id=$3 AND user_id=$4 RETURNING *`,
        [category !== undefined ? category : check.rows[0].category, mode !== undefined ? mode : check.rows[0].mode, id, user_id]
      );
      return result.rows[0];
    });

    if (!updated) return res.status(404).json({ message: 'Transaction not found' });
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, transactionLimiter, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try {
    const deleted = await pool.withUserTransaction(user_id, async (client) => {
      const check = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, user_id]
      );
      if (check.rows.length === 0) return false;
      await client.query('DELETE FROM transactions WHERE id=$1 AND user_id=$2', [id, user_id]);
      return true;
    });

    if (!deleted) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/import', auth, transactionLimiter, async (req, res) => {
  const { transactions } = req.body;
  const user_id = req.user.id;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [String(user_id)]);
    const inserted = [];
    let skipped = 0;
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const cleaned = cleanPayeeAndCategory(tx.description || tx.payee, tx.category);
      const payee = tx.payee || cleaned.payee;
      const category = tx.category || cleaned.category;
      const type = tx.type || cleaned.type || 'expense';

      const spName = `tx_sp_${i}`;
      await client.query(`SAVEPOINT ${spName}`);
      try {
        const result = await client.query(
          `INSERT INTO transactions (user_id, type, category, amount, description, payee, date, mode)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [user_id, type, category, tx.amount, tx.description, payee, tx.date, tx.mode || 'Other']
        );
        await client.query(`RELEASE SAVEPOINT ${spName}`);
        inserted.push(result.rows[0]);
      } catch (insertErr) {
        await client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
        if (
          insertErr.code === '23505' ||
          insertErr.message?.includes('duplicate key') ||
          insertErr.message?.includes('unique constraint') ||
          insertErr.constraint?.includes('idx_transactions_dedup_hash')
        ) {
          skipped++;
        } else {
          throw insertErr;
        }
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ count: inserted.length, skipped, transactions: inserted });
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