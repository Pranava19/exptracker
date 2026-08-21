const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');

const parseBoundedInt = (val, defaultVal, min, max) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = Number(val);
  if (!Number.isInteger(num) || num < min || num > max) return null;
  return num;
};

const parseDateString = (val) => {
  if (!val) return undefined;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
};

const buildFilterClause = ({ year, month, from, to, type }, params) => {
  let clause = '';
  
  if (year !== undefined && year !== null) {
    params.push(year);
    clause += ` AND EXTRACT(YEAR FROM date::date) = $${params.length}`;
  }

  if (month !== undefined && month !== null) {
    params.push(month);
    clause += ` AND EXTRACT(MONTH FROM date::date) = $${params.length}`;
  }

  if (from) {
    params.push(from);
    clause += ` AND date::date >= $${params.length}`;
  }

  if (to) {
    params.push(to);
    clause += ` AND date::date <= $${params.length}`;
  }

  if (type && type !== 'all') {
    params.push(type);
    clause += ` AND type = $${params.length}`;
  }

  return clause;
};

router.get('/monthly-summary', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const from = parseDateString(req.query.from);
  const to = parseDateString(req.query.to);

  if (year === null || from === null || to === null) {
    return res.status(400).json({ message: 'Invalid query parameters' });
  }

  try {
    const params = [req.user.id];
    const filterClause = buildFilterClause({ year, from, to }, params);

    const result = await pool.query(
      `SELECT
        EXTRACT(MONTH FROM date::date)::int AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id = $1
         AND date IS NOT NULL AND amount IS NOT NULL
         ${filterClause}
       GROUP BY EXTRACT(MONTH FROM date::date)
       ORDER BY month ASC`,
      params
    );

    const monthsMap = {};
    result.rows.forEach(r => {
      monthsMap[r.month] = {
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
      };
    });

    const formatted = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: monthsMap[i + 1]?.income || 0,
      expense: monthsMap[i + 1]?.expense || 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /monthly-summary:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/net-cashflow', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const from = parseDateString(req.query.from);
  const to = parseDateString(req.query.to);

  if (year === null || from === null || to === null) {
    return res.status(400).json({ message: 'Invalid query parameters' });
  }

  try {
    const params = [req.user.id];
    const filterClause = buildFilterClause({ year, from, to }, params);

    const result = await pool.query(
      `SELECT
        EXTRACT(MONTH FROM date::date)::int AS month,
        SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END) AS net
       FROM transactions
       WHERE user_id = $1
         AND date IS NOT NULL AND amount IS NOT NULL
         ${filterClause}
       GROUP BY EXTRACT(MONTH FROM date::date)
       ORDER BY month ASC`,
      params
    );

    const monthsMap = {};
    result.rows.forEach(r => {
      monthsMap[r.month] = parseFloat(r.net || 0);
    });

    const formatted = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      net: monthsMap[i + 1] || 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /net-cashflow:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/daily-expenses', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const month = parseBoundedInt(req.query.month, new Date().getMonth() + 1, 1, 12);
  const from = parseDateString(req.query.from);
  const to = parseDateString(req.query.to);

  if (year === null || month === null || from === null || to === null) {
    return res.status(400).json({ message: 'Invalid query parameters' });
  }

  try {
    const params = [req.user.id];
    const filterClause = buildFilterClause({ year, month, from, to, type: 'expense' }, params);

    const result = await pool.query(
      `SELECT
        date::text AS date,
        SUM(amount) AS total_expense
       FROM transactions
       WHERE user_id = $1
         AND date IS NOT NULL AND amount IS NOT NULL
         ${filterClause}
       GROUP BY date::text
       ORDER BY date ASC`,
      params
    );

    const formatted = result.rows.map(r => ({
      date: r.date.slice(0, 10),
      total_expense: parseFloat(r.total_expense || 0),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /daily-expenses:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/top-transactions', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const month = parseBoundedInt(req.query.month, undefined, 1, 12);
  const limit = parseBoundedInt(req.query.limit, 5, 1, 100);
  const from = parseDateString(req.query.from);
  const to = parseDateString(req.query.to);

  if (year === null || month === null || limit === null || from === null || to === null) {
    return res.status(400).json({ message: 'Invalid query parameters' });
  }

  try {
    const params = [req.user.id];
    const filterClause = buildFilterClause({ year, month, from, to, type: 'expense' }, params);

    params.push(limit);
    const limitParamIndex = params.length;

    const result = await pool.query(
      `SELECT
        date::text AS date,
        COALESCE(description, '') AS description,
        COALESCE(payee, '') AS payee,
        COALESCE(NULLIF(payee, ''), description, 'Unknown') AS label,
        amount
       FROM transactions
       WHERE user_id = $1
         AND date IS NOT NULL AND amount IS NOT NULL
         ${filterClause}
       ORDER BY amount DESC
       LIMIT $${limitParamIndex}`,
      params
    );

    const formatted = result.rows.map(r => ({
      date: r.date.slice(0, 10),
      description: r.description,
      payee: r.payee,
      label: r.label,
      amount: parseFloat(r.amount || 0),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /top-transactions:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/summary-cards', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, undefined, 2000, 2100);
  const month = parseBoundedInt(req.query.month, undefined, 1, 12);
  const from = parseDateString(req.query.from);
  const to = parseDateString(req.query.to);
  const typeQuery = req.query.type;

  let type = 'all';
  if (typeQuery === 'income' || typeQuery === 'expense') type = typeQuery;

  if (year === null || month === null || from === null || to === null) {
    return res.status(400).json({ message: 'Invalid query parameters' });
  }

  try {
    const params = [req.user.id];
    const filterClause = buildFilterClause({ year, month, from, to, type }, params);

    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
        MAX(CASE WHEN type = 'expense' THEN amount ELSE NULL END) AS highest_expense,
        COUNT(DISTINCT CASE WHEN type = 'expense' THEN date::date ELSE NULL END) AS distinct_expense_days,
        COUNT(*)::int AS transaction_count
       FROM transactions
       WHERE user_id = $1
         AND date IS NOT NULL AND amount IS NOT NULL
         ${filterClause}`,
      params
    );

    const row = result.rows[0] || {};
    const total_income = parseFloat(row.total_income || 0);
    const total_expenses = parseFloat(row.total_expenses || 0);
    const current_balance = total_income - total_expenses;
    const highest_expense = parseFloat(row.highest_expense || 0);
    const distinct_expense_days = parseInt(row.distinct_expense_days || 0, 10);
    const avg_daily_expense = distinct_expense_days > 0 ? total_expenses / distinct_expense_days : 0;
    const transaction_count = parseInt(row.transaction_count || 0, 10);

    res.json({
      total_income,
      total_expenses,
      current_balance,
      highest_expense,
      avg_daily_expense,
      transaction_count,
    });
  } catch (err) {
    console.error('Error in /summary-cards:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
