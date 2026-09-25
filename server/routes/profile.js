const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

// GET /api/profile/balance or /api/profile - Retrieve current balance baseline
router.get(['/', '/balance'], auth, transactionLimiter, async (req, res) => {
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

// PUT /api/profile/balance or /api/profile - Update baseline balance and as of date
router.put(['/', '/balance'], auth, transactionLimiter, async (req, res) => {
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

// GET /api/profile/backup - Export complete user financial dataset
router.get('/backup', auth, transactionLimiter, async (req, res) => {
  const userId = req.user.id;
  try {
    const data = await pool.withUserTransaction(userId, async (client) => {
      // 1. User profile baseline
      const userRes = await client.query(
        'SELECT starting_balance, starting_balance_date FROM users WHERE id = $1',
        [userId]
      );
      const user = userRes.rows[0] || {};

      // 2. All transactions
      const txRes = await client.query(
        `SELECT type, category, amount, description, payee, date, mode, created_at 
         FROM transactions 
         WHERE user_id = $1 
         ORDER BY date ASC, id ASC`,
        [userId]
      );

      // 3. All subscriptions
      const subRes = await client.query(
        `SELECT name, amount, frequency, due_date, category, payment_mode, status, created_at 
         FROM subscriptions 
         WHERE user_id = $1 
         ORDER BY id ASC`,
        [userId]
      );

      return {
        version: 1,
        app: 'ExpTracker',
        exported_at: new Date().toISOString(),
        profile: {
          starting_balance: user.starting_balance !== null && user.starting_balance !== undefined ? parseFloat(user.starting_balance) : null,
          starting_balance_date: user.starting_balance_date || null,
        },
        transactions: txRes.rows.map(t => ({
          ...t,
          amount: parseFloat(t.amount),
        })),
        subscriptions: subRes.rows.map(s => ({
          ...s,
          amount: parseFloat(s.amount),
        })),
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="exptracker_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(data);
  } catch (err) {
    console.error('Error creating backup:', err.message);
    res.status(500).json({ message: 'Server error creating backup' });
  }
});

// POST /api/profile/restore - Import and restore user financial dataset
router.post('/restore', auth, transactionLimiter, async (req, res) => {
  const userId = req.user.id;
  const backup = req.body;

  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ message: 'Invalid backup file format' });
  }

  if (backup.version !== 1 && !backup.transactions && !backup.profile) {
    return res.status(400).json({ message: 'Unrecognized backup structure. Please provide a valid ExpTracker JSON backup.' });
  }

  try {
    const stats = await pool.withUserTransaction(userId, async (client) => {
      let restoredTxs = 0;
      let restoredSubs = 0;
      let balanceUpdated = false;

      // 1. Restore Profile Baseline if present
      if (backup.profile && backup.profile.starting_balance !== undefined && backup.profile.starting_balance !== null) {
        const numBal = parseFloat(Number(backup.profile.starting_balance).toFixed(2));
        const balDate = backup.profile.starting_balance_date ? new Date(backup.profile.starting_balance_date) : new Date();
        await client.query(
          `UPDATE users SET starting_balance = $1, starting_balance_date = $2 WHERE id = $3`,
          [numBal, balDate, userId]
        );
        balanceUpdated = true;
      }

      // 2. Restore Transactions
      if (Array.isArray(backup.transactions) && backup.transactions.length > 0) {
        for (const tx of backup.transactions) {
          if (!tx.amount || !tx.type || !tx.category || !tx.date) continue;

          // Check if identical transaction already exists
          const existing = await client.query(
            `SELECT id FROM transactions 
             WHERE user_id = $1 AND type = $2 AND amount = $3 AND date::date = $4::date AND COALESCE(description, '') = COALESCE($5, '')
             LIMIT 1`,
            [userId, tx.type, parseFloat(tx.amount), new Date(tx.date).toISOString().slice(0, 10), tx.description || '']
          );

          if (existing.rows.length === 0) {
            await client.query(
              `INSERT INTO transactions (user_id, type, category, amount, description, payee, date, mode)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                tx.type,
                tx.category,
                parseFloat(tx.amount),
                tx.description || null,
                tx.payee || null,
                tx.date,
                tx.mode || 'Other',
              ]
            );
            restoredTxs++;
          }
        }
      }

      // 3. Restore Subscriptions
      if (Array.isArray(backup.subscriptions) && backup.subscriptions.length > 0) {
        for (const sub of backup.subscriptions) {
          if (!sub.name || !sub.amount) continue;

          const existingSub = await client.query(
            `SELECT id FROM subscriptions WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
            [userId, sub.name.trim()]
          );

          if (existingSub.rows.length === 0) {
            await client.query(
              `INSERT INTO subscriptions (user_id, name, amount, frequency, due_date, category, payment_mode, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                sub.name.trim(),
                parseFloat(sub.amount),
                sub.frequency || 'monthly',
                sub.due_date || 1,
                sub.category || 'Bills & Utilities',
                sub.payment_mode || 'UPI',
                sub.status || 'active',
              ]
            );
            restoredSubs++;
          }
        }
      }

      return { restoredTxs, restoredSubs, balanceUpdated };
    });

    res.json({
      message: 'Backup restored successfully',
      restoredTransactions: stats.restoredTxs,
      restoredSubscriptions: stats.restoredSubs,
      balanceUpdated: stats.balanceUpdated,
    });
  } catch (err) {
    console.error('Error restoring backup:', err.message);
    res.status(500).json({ message: 'Server error restoring backup' });
  }
});

module.exports = router;
