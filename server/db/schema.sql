-- ExpTracker PostgreSQL Database Schema

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

-- UUID Migration Preparation (Additive column preserving serial id backward compatibility)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);

-- Row-Level Security (RLS) Policy
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' AND policyname = 'transactions_user_isolation'
    ) THEN
        CREATE POLICY transactions_user_isolation ON transactions
            FOR ALL
            USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::int OR current_setting('app.current_user_id', true) IS NULL);
    END IF;
END $$;

-- Hardening database additions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS txn_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_id_txn_hash ON transactions(user_id, txn_hash) WHERE txn_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date ON transactions(user_id, date);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM transactions WHERE user_id IS NULL) THEN
    ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount_positive'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0) NOT VALID;
  END IF;
END $$;

