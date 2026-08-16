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

// 1. GET /api/analysis/top-payees?year=2026&limit=10
router.get('/top-payees', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const limit = parseBoundedInt(req.query.limit, 10, 1, 100);
  if (year === null || limit === null) {
    return res.status(400).json({ message: 'Invalid year or limit query parameter' });
  }

  try {
    const result = await pool.query(
      `SELECT
        COALESCE(NULLIF(payee, ''), description, 'Unknown') AS payee,
        SUM(amount) AS total_amount,
        COUNT(*)::int AS txn_count
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND EXTRACT(YEAR FROM date) = $2
       GROUP BY COALESCE(NULLIF(payee, ''), description, 'Unknown')
       ORDER BY total_amount DESC
       LIMIT $3`,
      [req.user.id, year, limit]
    );

    const formatted = result.rows.map(r => ({
      payee: r.payee,
      total_amount: parseFloat(r.total_amount || 0),
      txn_count: parseInt(r.txn_count || 0, 10),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /top-payees:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. GET /api/analysis/yoy?years=2025,2026
router.get('/yoy', auth, async (req, res) => {
  let years = [];
  if (req.query.years) {
    const rawYears = req.query.years.split(',');
    for (const y of rawYears) {
      const parsed = parseBoundedInt(y.trim(), null, 2000, 2100);
      if (parsed === null) {
        return res.status(400).json({ message: 'Invalid years query parameter' });
      }
      years.push(parsed);
    }
  } else {
    const currentYear = new Date().getFullYear();
    years = [currentYear - 1, currentYear];
  }

  try {
    const result = await pool.query(
      `SELECT
        EXTRACT(YEAR FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM date) = ANY($2::int[])
       GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
       ORDER BY year ASC, month ASC`,
      [req.user.id, years]
    );

    const formatted = result.rows.map(r => ({
      year: parseInt(r.year, 10),
      month: parseInt(r.month, 10),
      income: parseFloat(r.income || 0),
      expense: parseFloat(r.expense || 0),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /yoy:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. GET /api/analysis/weekday-split?year=2026
router.get('/weekday-split', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  if (year === null) {
    return res.status(400).json({ message: 'Invalid year query parameter' });
  }

  try {
    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN EXTRACT(DOW FROM date) IN (1,2,3,4,5) THEN amount ELSE 0 END) AS weekday_total,
        SUM(CASE WHEN EXTRACT(DOW FROM date) IN (0,6) THEN amount ELSE 0 END) AS weekend_total
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND EXTRACT(YEAR FROM date) = $2`,
      [req.user.id, year]
    );

    const row = result.rows[0] || {};
    const weekday_total = parseFloat(row.weekday_total || 0);
    const weekend_total = parseFloat(row.weekend_total || 0);
    const weekday_avg = weekday_total / 5;
    const weekend_avg = weekend_total / 2;

    res.json({
      weekday_total,
      weekend_total,
      weekday_avg,
      weekend_avg,
    });
  } catch (err) {
    console.error('Error in /weekday-split:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 4. GET /api/analysis/rolling-avg?year=2026&window=7
router.get('/rolling-avg', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const windowSize = parseBoundedInt(req.query.window, 7, 1, 90);
  if (year === null || windowSize === null) {
    return res.status(400).json({ message: 'Invalid year or window query parameter' });
  }

  try {
    const result = await pool.query(
      `WITH daily AS (
        SELECT
          date::text AS date,
          SUM(amount) AS daily_total
        FROM transactions
        WHERE user_id = $1
          AND type = 'expense'
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY date
       )
       SELECT
         date,
         daily_total,
         AVG(daily_total) OVER (
           ORDER BY date
           ROWS BETWEEN $3 PRECEDING AND CURRENT ROW
         ) AS rolling_avg
       FROM daily
       ORDER BY date ASC`,
      [req.user.id, year, windowSize - 1]
    );

    const formatted = result.rows.map(r => ({
      date: r.date.slice(0, 10),
      daily_total: parseFloat(r.daily_total || 0),
      rolling_avg: parseFloat(r.rolling_avg || 0),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /rolling-avg:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 5. GET /api/analysis/income-stability?year=2026
router.get('/income-stability', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  if (year === null) {
    return res.status(400).json({ message: 'Invalid year query parameter' });
  }

  try {
    const result = await pool.query(
      `WITH monthly_income AS (
        SELECT
          EXTRACT(MONTH FROM date)::int AS month,
          SUM(amount) AS m_income
        FROM transactions
        WHERE user_id = $1
          AND type = 'income'
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY EXTRACT(MONTH FROM date)
        HAVING SUM(amount) > 0
       )
       SELECT
         AVG(m_income) AS mean_income,
         COALESCE(STDDEV(m_income), 0) AS stddev
       FROM monthly_income`,
      [req.user.id, year]
    );

    const row = result.rows[0] || {};
    const mean_income = parseFloat(row.mean_income || 0);
    const stddev = parseFloat(row.stddev || 0);
    const coefficient_of_variation = mean_income > 0 ? (stddev / mean_income) * 100 : 0;

    res.json({
      mean_income,
      stddev,
      coefficient_of_variation,
    });
  } catch (err) {
    console.error('Error in /income-stability:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 6. GET /api/analysis/savings-rate-monthly?year=2026
router.get('/savings-rate-monthly', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  if (year === null) {
    return res.status(400).json({ message: 'Invalid year query parameter' });
  }

  try {
    const result = await pool.query(
      `WITH monthly AS (
        SELECT
          EXTRACT(MONTH FROM date)::int AS month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE user_id = $1
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY EXTRACT(MONTH FROM date)
        ORDER BY month ASC
       )
       SELECT
         month,
         income,
         expense,
         CASE
           WHEN income > 0 THEN ((income - expense) / income) * 100
           ELSE NULL
         END AS savings_rate
       FROM monthly`,
      [req.user.id, year]
    );

    const formatted = result.rows.map(r => ({
      month: parseInt(r.month, 10),
      savings_rate: r.savings_rate === null ? null : parseFloat(r.savings_rate),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /savings-rate-monthly:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 7. GET /api/analysis/anomalies?year=2026&limit=5
router.get('/anomalies', auth, async (req, res) => {
  const year = parseBoundedInt(req.query.year, new Date().getFullYear(), 2000, 2100);
  const limit = parseBoundedInt(req.query.limit, 5, 1, 100);
  if (year === null || limit === null) {
    return res.status(400).json({ message: 'Invalid year or limit query parameter' });
  }

  try {
    const result = await pool.query(
      `WITH stats AS (
        SELECT
          AVG(amount) AS mean_amt,
          STDDEV(amount) AS stddev_amt
        FROM transactions
        WHERE user_id = $1
          AND type = 'expense'
          AND EXTRACT(YEAR FROM date) = $2
       )
       SELECT
         t.date::text AS date,
         COALESCE(NULLIF(t.payee, ''), t.description, 'Unknown') AS payee,
         t.amount,
         CASE
           WHEN s.stddev_amt > 0 THEN (t.amount - s.mean_amt) / s.stddev_amt
           ELSE 0
         END AS std_devs_above_mean
       FROM transactions t, stats s
       WHERE t.user_id = $1
         AND t.type = 'expense'
         AND EXTRACT(YEAR FROM date) = $2
         AND s.stddev_amt IS NOT NULL
         AND s.stddev_amt > 0
         AND t.amount > (s.mean_amt + 2 * s.stddev_amt)
       ORDER BY t.amount DESC
       LIMIT $3`,
      [req.user.id, year, limit]
    );

    const formatted = result.rows.map(r => ({
      date: r.date.slice(0, 10),
      payee: r.payee,
      amount: parseFloat(r.amount),
      std_devs_above_mean: parseFloat(r.std_devs_above_mean),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error in /anomalies:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 8. GET /api/analysis/projection
router.get('/projection', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const result = await pool.query(
      `SELECT
        SUM(amount) AS current_month_spend
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [req.user.id, currentMonth, currentYear]
    );

    const totalSpend = parseFloat(result.rows[0]?.current_month_spend || 0);
    const days_elapsed = now.getDate();
    const days_in_month = new Date(currentYear, currentMonth, 0).getDate();
    const daily_avg = days_elapsed > 0 ? totalSpend / days_elapsed : 0;
    const projected_total = daily_avg * days_in_month;

    res.json({
      daily_avg,
      days_elapsed,
      days_in_month,
      projected_total,
    });
  } catch (err) {
    console.error('Error in /projection:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
