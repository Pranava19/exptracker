const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
  // Do not crash the process — pg will create a new connection on the next query
});

pool.connect()
  .then(() => console.log('PostgreSQL connected'))
  .catch((err) => console.error('DB connection error:', err.message));

module.exports = pool;