/**
 * Migration 002: Create payee_rules table and row-level security policy
 */
const pool = require('../index');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS payee_rules (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          pattern VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payee_rules_user_id ON payee_rules(user_id);

      ALTER TABLE payee_rules ENABLE ROW LEVEL SECURITY;
      ALTER TABLE payee_rules FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS payee_rules_user_isolation ON payee_rules;

      CREATE POLICY payee_rules_user_isolation ON payee_rules
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

    await client.query('COMMIT');
    console.log('Migration 002_create_payee_rules applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrate;
