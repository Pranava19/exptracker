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
    starting_balance NUMERIC(12, 2) DEFAULT NULL,
    starting_balance_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
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

-- Baseline Balance Adjustment Migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS starting_balance NUMERIC(12, 2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS starting_balance_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Non-owner role for application isolation
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

-- Row-Level Security (RLS) Policy
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
