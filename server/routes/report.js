const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { sendMonthlySummaryReportEmail } = require('../utils/sendEmail');
const logger = require('../utils/logger');

router.post('/send-monthly-email', auth, async (req, res) => {
  const user_id = req.user.id;
  const now = new Date();
  const year = req.body.year ? parseInt(req.body.year, 10) : now.getFullYear();
  const month = req.body.month ? parseInt(req.body.month, 10) : (now.getMonth() + 1);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = `${monthNames[month - 1]} ${year}`;

  try {
    // 1. Fetch User Details
    const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userResult.rows[0];

    // 2. Fetch Monthly Summary Totals
    const summaryResult = await pool.query(
      `SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM date::date) = $2
         AND EXTRACT(MONTH FROM date::date) = $3`,
      [user_id, year, month]
    );

    const row = summaryResult.rows[0] || {};
    const totalIncome = parseFloat(row.total_income || 0);
    const totalExpenses = parseFloat(row.total_expenses || 0);
    const netSavings = totalIncome - totalExpenses;

    // 3. Fetch Top 5 Expenses
    const topResult = await pool.query(
      `SELECT
        date::text AS date,
        COALESCE(NULLIF(payee, ''), description, 'Expense') AS payee,
        amount
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND EXTRACT(YEAR FROM date::date) = $2
         AND EXTRACT(MONTH FROM date::date) = $3
       ORDER BY amount DESC
       LIMIT 5`,
      [user_id, year, month]
    );

    const topTransactions = topResult.rows.map(r => ({
      date: r.date.slice(0, 10),
      payee: r.payee,
      amount: parseFloat(r.amount || 0),
    }));

    // 4. Send Email
    await sendMonthlySummaryReportEmail(user, {
      monthName,
      totalIncome,
      totalExpenses,
      netSavings,
      topTransactions,
    });

    logger.info(`Monthly financial report email sent to user ${user.email} for ${monthName}`);
    res.json({ message: `Monthly financial summary report sent to ${user.email} successfully!` });
  } catch (err) {
    logger.error('Error sending monthly email report:', err.message);
    res.status(500).json({ message: 'Failed to send monthly email report', error: err.message });
  }
});

module.exports = router;
