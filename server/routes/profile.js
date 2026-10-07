const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

// GET /api/profile/backup - Export complete user financial dataset
router.get('/backup', auth, transactionLimiter, async (req, res) => {
  const userId = req.user.id;
  try {
    const data = await pool.withUserTransaction(userId, async (client) => {
      const txRes = await client.query(
        `SELECT type, category, amount, description, payee, date, mode, created_at 
         FROM transactions 
         WHERE user_id = $1 
         ORDER BY date ASC, id ASC`,
        [userId]
      );

      return {
        version: 1,
        app: 'ExpTracker',
        exported_at: new Date().toISOString(),
        transactions: txRes.rows.map(t => ({
          ...t,
          amount: parseFloat(t.amount),
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

  if (backup.version !== 1 && !backup.transactions) {
    return res.status(400).json({ message: 'Unrecognized backup structure. Please provide a valid ExpTracker JSON backup.' });
  }

  try {
    const stats = await pool.withUserTransaction(userId, async (client) => {
      let restoredTxs = 0;

      // Restore Transactions
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

      return { restoredTxs };
    });

    res.json({
      message: 'Backup restored successfully',
      restoredTransactions: stats.restoredTxs,
    });
  } catch (err) {
    console.error('Error restoring backup:', err.message);
    res.status(500).json({ message: 'Server error restoring backup' });
  }
});

module.exports = router;
