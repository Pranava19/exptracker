const pool = require('../index');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running one-time deduplication migration...');
    await client.query('BEGIN');
    const res = await client.query(`
      DELETE FROM transactions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM transactions
        GROUP BY user_id, date, amount, type, LOWER(TRIM(COALESCE(description, ''))), LOWER(TRIM(COALESCE(payee, '')))
      );
    `);
    await client.query('COMMIT');
    console.log(`Deduplication migration completed: removed ${res.rowCount} duplicate rows.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
