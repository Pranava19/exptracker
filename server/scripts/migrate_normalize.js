/**
 * server/scripts/migrate_normalize.js
 * One-time migration script to normalize descriptions, backfill payees/categories/modes,
 * remove duplicates, and ensure the unique dedup index exists.
 *
 * Usage:
 *   node server/scripts/migrate_normalize.js --dry-run
 *   node server/scripts/migrate_normalize.js
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const pool = require('../db/index');
const { cleanPayeeAndCategory, normalizeDescription } = require('../utils/payeeCleaner');
const { parseStatementFile } = require('../routes/import');

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=======================================================`);
  console.log(`Starting migration (Mode: ${isDryRun ? 'DRY-RUN (will rollback)' : 'APPLY (will commit)'})`);
  console.log(`Database Host: ${new URL(process.env.DATABASE_URL).host}`);
  console.log(`=======================================================\n`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Temporarily disable RLS for administrative migration access
    await client.query('ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');

    // -------------------------------------------------------------------------
    // 1. Normalize existing transaction descriptions
    // -------------------------------------------------------------------------
    console.log('Step 1: Normalizing transaction descriptions...');
    const normRes = await client.query(`
      UPDATE transactions
      SET description = TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(description, E'[\\r\\n]+', ' ', 'g'),
            'CIF:\\s*\\d+', '', 'gi'
          ),
          '\\s+', ' ', 'g'
        )
      )
      WHERE description IS NOT NULL
        AND (
          description ~ '[\\r\\n]'
          OR description ~ '\\s{2,}'
          OR description ~* 'CIF:\\s*\\d+'
          OR description ~ '^\\s+'
          OR description ~ '\\s+$'
        );
    `);
    console.log(`  -> Normalized descriptions for ${normRes.rowCount} rows.\n`);

    // -------------------------------------------------------------------------
    // 2. Backfill empty/Other payee, category, and mode via payeeCleaner
    //    (Strictly preserving manually assigned categories that are not 'Other')
    // -------------------------------------------------------------------------
    console.log('Step 2: Backfilling payees, categories, and payment modes...');
    const rulesRes = await client.query('SELECT user_id, pattern, display_name, category FROM payee_rules');
    const userRulesMap = new Map();
    for (const r of rulesRes.rows) {
      if (!userRulesMap.has(r.user_id)) userRulesMap.set(r.user_id, []);
      userRulesMap.get(r.user_id).push(r);
    }

    const txRes = await client.query(`
      SELECT id, user_id, date, amount, type, description, payee, category, mode
      FROM transactions
      ORDER BY id ASC;
    `);

    let categoryBackfilledCount = 0;
    let payeeBackfilledCount = 0;
    let modeBackfilledCount = 0;
    let totalUpdatedRows = 0;

    for (const row of txRes.rows) {
      const customRules = userRulesMap.get(row.user_id) || [];
      const cleaned = cleanPayeeAndCategory(row.description || row.payee, null, customRules, row.type);

      let newCategory = row.category;
      let newPayee = row.payee;
      let newMode = row.mode;
      let changed = false;

      // Only touch rows where category is 'Other' or null (preserve manual categories)
      if (!row.category || row.category === 'Other') {
        if (cleaned.category && cleaned.category !== 'Other' && cleaned.category !== row.category) {
          newCategory = cleaned.category;
          categoryBackfilledCount++;
          changed = true;
        }
      }

      // Backfill payee if empty or generic placeholder
      if (!row.payee || row.payee.trim() === '' || row.payee === 'Bank Transaction' || row.payee === 'Other Merchant') {
        if (cleaned.payee && cleaned.payee !== row.payee) {
          newPayee = cleaned.payee;
          payeeBackfilledCount++;
          changed = true;
        }
      }

      // Backfill payment mode if empty or 'Other'
      if (!row.mode || row.mode === 'Other') {
        if (cleaned.mode && cleaned.mode !== 'Other' && cleaned.mode !== row.mode) {
          newMode = cleaned.mode;
          modeBackfilledCount++;
          changed = true;
        }
      }

      if (changed) {
        totalUpdatedRows++;
        await client.query(
          `UPDATE transactions SET category = $1, payee = $2, mode = $3 WHERE id = $4`,
          [newCategory, newPayee, newMode, row.id]
        );
      }
    }

    console.log(`  -> Rows examined: ${txRes.rows.length}`);
    console.log(`  -> Rows updated: ${totalUpdatedRows}`);
    console.log(`     - Categories backfilled: ${categoryBackfilledCount}`);
    console.log(`     - Payees backfilled: ${payeeBackfilledCount}`);
    console.log(`     - Modes backfilled: ${modeBackfilledCount}\n`);

    // -------------------------------------------------------------------------
    // 3. Delete duplicate rows, keeping lowest id per (user_id, date, amount, type, description, payee)
    // -------------------------------------------------------------------------
    console.log('Step 3: Deduplicating transactions...');
    const dupRes = await client.query(`
      DELETE FROM transactions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM transactions
        GROUP BY user_id, date, amount, type, LOWER(TRIM(COALESCE(description, ''))), LOWER(TRIM(COALESCE(payee, '')))
      );
    `);
    console.log(`  -> Removed ${dupRes.rowCount} duplicate transaction rows.\n`);

    // -------------------------------------------------------------------------
    // 4. Drop and recreate unique index idx_transactions_dedup_hash
    // -------------------------------------------------------------------------
    console.log('Step 4: Ensuring unique deduplication index idx_transactions_dedup_hash...');
    await client.query('DROP INDEX IF EXISTS idx_transactions_dedup_hash;');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup_hash ON transactions (
        user_id,
        date,
        amount,
        type,
        (LOWER(TRIM(COALESCE(description, '')))),
        (LOWER(TRIM(COALESCE(payee, ''))))
      );
    `);
    console.log('  -> Unique index recreated successfully.\n');

    // -------------------------------------------------------------------------
    // 5. Verification: Check index and simulate re-import
    // -------------------------------------------------------------------------
    console.log('Step 5: Verifying index and statement idempotency...');
    const idxCheck = await client.query(
      "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_transactions_dedup_hash'"
    );
    if (idxCheck.rows.length === 0) {
      throw new Error('Verification failed: idx_transactions_dedup_hash not found after creation.');
    }
    console.log('  -> Verified index exists in pg_indexes.');

    // Check if reference file exists to test idempotency
    const refFile = path.resolve(__dirname, '../../full_history_till_06_10_2026.xlsx');
    if (fs.existsSync(refFile)) {
      const fileBuf = fs.readFileSync(refFile);
      const parsed = await parseStatementFile(fileBuf);

      // Check against user 2 (or any user with existing transactions)
      const userRes = await client.query(
        'SELECT user_id, COUNT(*) as count FROM transactions GROUP BY user_id ORDER BY count DESC LIMIT 1'
      );
      if (userRes.rows.length > 0) {
        const testUserId = userRes.rows[0].user_id;
        const existingTx = await client.query(
          `SELECT date::text, amount, type, LOWER(TRIM(COALESCE(description, ''))) as description, LOWER(TRIM(COALESCE(payee, ''))) as payee
           FROM transactions WHERE user_id = $1`,
          [testUserId]
        );
        const existingSet = new Set(
          existingTx.rows.map(r => `${r.date}|${parseFloat(r.amount)}|${r.type}|${r.description}|${r.payee}`)
        );

        let potentialInserts = 0;
        for (const tx of parsed.transactions) {
          const key = `${tx.date}|${tx.amount}|${tx.type}|${tx.description.toLowerCase().trim()}|${(tx.payee || '').toLowerCase().trim()}`;
          if (!existingSet.has(key)) {
            potentialInserts++;
          }
        }
        console.log(`  -> Checked against user ${testUserId} (${existingTx.rows.length} transactions currently in DB):`);
        console.log(`     - Rows in reference file: ${parsed.totalRows}`);
        console.log(`     - Reference file rows that would be newly inserted: ${potentialInserts}`);
        console.log(`     - Reference file rows that are already present: ${parsed.totalRows - potentialInserts}`);
      }
    }

    // -------------------------------------------------------------------------
    // Finalization: Re-enable RLS and Commit / Rollback
    // -------------------------------------------------------------------------
    await client.query('ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE transactions FORCE ROW LEVEL SECURITY;');

    if (isDryRun) {
      await client.query('ROLLBACK');
      console.log('\n=======================================================');
      console.log('DRY-RUN SUCCESSFUL: All operations completed and ROLLED BACK.');
      console.log('Zero changes were committed to the database.');
      console.log('=======================================================');
    } else {
      await client.query('COMMIT');
      console.log('\n=======================================================');
      console.log('MIGRATION APPLIED AND COMMITTED SUCCESSFULLY.');
      console.log('=======================================================');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nMIGRATION ERROR (Transaction rolled back):', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runMigration;
