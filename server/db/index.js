const { Pool } = require('pg');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const isNeon = process.env.DATABASE_URL?.includes('neon') || process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (isProd || isNeon) ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (kept process alive):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (kept process alive):', reason);
});

const initSchema = async (client) => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          is_verified BOOLEAN DEFAULT false,
          verification_token VARCHAR(255),
          verification_token_expires TIMESTAMP WITH TIME ZONE,
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
          category VARCHAR(100) NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          description TEXT,
          payee VARCHAR(255),
          date DATE NOT NULL,
          mode VARCHAR(50) DEFAULT 'Other',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);
      ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    `);
    console.log('PostgreSQL schema verified/initialized');
  } catch (err) {
    console.error('Schema initialization notice:', err.message);
  }
};

pool.connect()
  .then(async (client) => {
    console.log('PostgreSQL connected');
    await initSchema(client);
    client.release();
  })
  .catch((err) => console.error('DB connection error:', err.message));

module.exports = pool;