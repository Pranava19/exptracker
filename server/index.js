const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const pool = require('./db/index');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const importRoute = require('./routes/import');
const { authLimiter, importLimiter, transactionLimiter, resendLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));
app.use(express.json());

// Rate limiters
app.use(['/api/auth/login', '/auth/login'], authLimiter);
app.use(['/api/auth/register', '/auth/register'], authLimiter);
app.use(['/api/auth/resend-verification', '/auth/resend-verification'], resendLimiter);

// API Routes
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/transactions', '/transactions'], transactionLimiter, transactionRoutes);
app.use(['/api/import', '/import'], importLimiter, importRoute);

// Serverless root POST fallback for /import
app.post(['/', '/api'], (req, res, next) => {
  return importRoute(req, res, next);
});

app.get(['/', '/api'], (req, res) => {
  res.send('Expense Tracker API is running');
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler — must be last, 4 args required for Express to recognize it
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;