const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
  // Do not crash the process — pg will create a new connection on the next query
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (kept process alive):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (kept process alive):', reason);
});

pool.connect()
  .then((client) => {
    console.log('PostgreSQL connected');
    client.release();
  })
  .catch((err) => console.error('DB connection error:', err.message));

module.exports = pool;