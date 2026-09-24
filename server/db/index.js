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

      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS starting_balance NUMERIC(12, 2) DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS starting_balance_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
          CREATE ROLE app_user WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;

      DO $$
      BEGIN
        GRANT USAGE ON SCHEMA public TO app_user;
        GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;

      ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE transactions FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS transactions_user_isolation ON transactions;

      CREATE POLICY transactions_user_isolation ON transactions
      FOR ALL
      TO PUBLIC
      USING (
        user_id = (
          CASE 
            WHEN current_setting('app.user_id', true) ~ '^[0-9]+$' 
            THEN current_setting('app.user_id', true)::int 
            ELSE NULL 
          END
        )
      );
    `);
    console.log('PostgreSQL schema verified/initialized');

    // Startup safety check: verify transactions RLS policy exists
    const policyRes = await client.query("SELECT count(*) FROM pg_policy WHERE polrelid = 'transactions'::regclass");
    const policyCount = parseInt(policyRes.rows[0]?.count || '0', 10);
    if (policyCount === 0) {
      const errMsg = 'FATAL RLS ERROR: 0 Row-Level Security policies found on transactions table! Zero policies with FORCE ROW LEVEL SECURITY will block all data access for app_user.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
  } catch (err) {
    console.error('Schema initialization error:', err.message);
    throw err;
  }
};

pool.withUserTransaction = async (userId, callback) => {
  if (typeof pool.connect !== 'function') {
    return callback(pool);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [String(userId)]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
};

pool.connect()
  .then(async (client) => {
    console.log('PostgreSQL connected');
    try {
      await initSchema(client);
    } finally {
      client.release();
    }
  })
  .catch((err) => console.error('DB connection/initialization error:', err.message));

module.exports = pool;