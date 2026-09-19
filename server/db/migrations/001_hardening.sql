-- 001_hardening.sql - Hardening database migration

-- 1. Add txn_hash column and unique index idempotently
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS txn_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_id_txn_hash ON transactions(user_id, txn_hash) WHERE txn_hash IS NOT NULL;

-- 2. Add index on (user_id, date)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date ON transactions(user_id, date);

-- 3. Set user_id NOT NULL only if no NULL user_id rows exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM transactions WHERE user_id IS NULL) THEN
    ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 4. Add check constraint amount > 0 NOT VALID idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount_positive'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0) NOT VALID;
  END IF;
END $$;
