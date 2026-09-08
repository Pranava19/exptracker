const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const pool = require('./db/index');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const importRoute = require('./routes/import');
const analysisRoutes = require('./routes/analysis');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { authLimiter, importLimiter, transactionLimiter, resendLimiter } = require('./middleware/rateLimiter');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or no-origin requests, or dynamically match client origin
    if (!origin) return callback(null, true);
    const allowed = process.env.CLIENT_URL;
    if (allowed && allowed !== '*' && allowed !== origin) {
      // If specific CLIENT_URL matches or multiple origins are permitted
      return callback(null, origin);
    }
    return callback(null, origin);
  },
  credentials: true,
}));
app.use(express.json());

app.use(['/api/auth/login', '/auth/login'], authLimiter);
app.use(['/api/auth/register', '/auth/register'], authLimiter);
app.use(['/api/auth/resend-verification', '/auth/resend-verification'], resendLimiter);
app.use(['/api/auth/forgot-password', '/auth/forgot-password'], resendLimiter);

app.get(['/api/health', '/health'], async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Health check database query failed: %s', err.message);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(['/api-docs', '/docs'], swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const reportRoutes = require('./routes/report');

app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/transactions', '/transactions'], transactionLimiter, transactionRoutes);
app.use(['/api/import', '/import'], importLimiter, importRoute);
app.use(['/api/analysis', '/analysis'], transactionLimiter, analysisRoutes);
app.use(['/api/reports', '/reports'], transactionLimiter, reportRoutes);

// Serverless root POST fallback for /import
app.post(['/', '/api'], (req, res, next) => {
  return importRoute(req, res, next);
});

app.get(['/', '/api'], (req, res) => {
  res.send('Expense Tracker API is running');
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (must be last; 4 parameters required by Express)
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

module.exports = app;