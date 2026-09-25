const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

// Monthly report email endpoint - disabled as email features are removed
router.post('/send-monthly-email', auth, transactionLimiter, (req, res) => {
  res.json({ message: 'Email reporting feature has been disabled.' });
});

module.exports = router;
