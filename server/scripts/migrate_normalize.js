/**
 * server/scripts/migrate_normalize.js
 * One-time migration script to normalize descriptions, backfill payees/categories/modes,
 * remove duplicates, and ensure the unique dedup index exists.
 *
 * Usage:
 *   node server/scripts/migrate_normalize.js --dry-run
 *   node server/scripts/migrate_normalize.js
 *   node server/scripts/migrate_normalize.js --backup
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const pool = require('../db/index');
const { cleanPayeeAndCategory, normalizeDescription, getDedupKey } = require('../utils/payeeCleaner');
const { parseStatementFile } = require('../routes/import');

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run');
  const shouldBackup = !isDryRun || process.argv.includes('--backup');

  console.log(`=======================================================`);
  console.log(`Starting migration (Mode: ${isDryRun ? 'DRY-RUN (will rollback)' : 'APPLY (will commit)'})`);
  console.log(`Database Host: ${new URL(process.env.DATABASE_URL).host}`);
  console.log(`Backup on start: ${shouldBackup ? 'YES' : 'NO'}`);
  console.log(`=======================================================\n`);

  const client = await pool.connect();

  try {
    // -------------------------------------------------------------------------
    // Pre-flight: Record user row counts & Take backup if requested
    // -------------------------------------------------------------------------
    const preCountRes = await client.query(`
      SELECT user_id, COUNT(*) as count
      FROM transactions
      GROUP BY user_id
      ORDER BY user_id ASC;
    `);

    const beforeCounts = new Map();
    for (const r of preCountRes.rows) {
      beforeCounts.set(r.user_id, parseInt(r.count, 10));
    }

    console.log('--- Initial Row Counts Per User ---');
    for (const [uid, count] of beforeCounts.entries()) {
      console.log(`  User ID ${uid}: ${count} rows`);
    }
    console.log('');

    if (shouldBackup) {
      const backupDir = path.resolve(__dirname, '../../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const allTxRes = await client.query(`
        SELECT * FROM transactions ORDER BY user_id ASC, date ASC, id ASC;
      `);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `pre_migration_${timestamp}.json`);

      fs.writeFileSync(backupFile, JSON.stringify(allTxRes.rows, null, 2));
      console.log(`[BACKUP] Wrote ${allTxRes.rows.length} rows to ${backupFile}\n`);
    }

    await client.query('BEGIN');

    // Temporarily disable RLS for administrative migration access
    await client.query('ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');

    // -------------------------------------------------------------------------
    // Optional: Synchronize manual entries with canonical statement file if available
    // -------------------------------------------------------------------------
    const refFile = path.resolve(__dirname, '../../full_history_till_06_10_2026.xlsx');
    let manualUpgradedCount = 0;

    if (fs.existsSync(refFile)) {
      const fileBuf = fs.readFileSync(refFile);
      const parsedRef = await parseStatementFile(fileBuf);

      const allDbTxs = await client.query(`
        SELECT id, user_id, date::text, amount, type, description, payee
        FROM transactions
      `);

      for (const dbRow of allDbTxs.rows) {
        const amt = parseFloat(dbRow.amount);
        const dbDesc = (dbRow.description || '').trim();

        // If description is a manual short note (e.g. 'Jio Prep', 'Zomato O', 'PSG TECH') without UPI prefix
        if (dbDesc.length <= 30 && !dbDesc.toUpperCase().includes('UPI/')) {
          const matchedStmt = parsedRef.transactions.find(t =>
            t.date === dbRow.date &&
            Math.abs(t.amount - amt) < 0.01 &&
            t.type === dbRow.type &&
            t.description.toLowerCase().includes(dbDesc.toLowerCase())
          );

          if (matchedStmt) {
            await client.query(
              `UPDATE transactions SET description = $1, payee = $2 WHERE id = $3`,
              [matchedStmt.description, matchedStmt.payee, dbRow.id]
            );
            manualUpgradedCount++;
          }
        }
      }

      if (manualUpgradedCount > 0) {
        console.log(`Step 0: Synchronized ${manualUpgradedCount} manual shorthand entries with full statement narrations.\n`);
      }
    }

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
    //    (Strictly preserving manually assigned categories that are not 'Other' / null)
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

      // Only touch rows where category is 'Other' or null (never overwrite manual categories)
      if (!row.category || row.category === 'Other') {
        if (cleaned.category && cleaned.category !== 'Other' && cleaned.category !== row.category) {
          newCategory = cleaned.category;
          categoryBackfilledCount++;
          changed = true;
        }
      }

      // Backfill or normalize payee (normalize multi-spaces or missing payees)
      if (
        !row.payee ||
        row.payee.trim() === '' ||
        row.payee === 'Bank Transaction' ||
        row.payee === 'Other Merchant' ||
        row.payee.includes('  ')
      ) {
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
    console.log(`     - Payees backfilled/normalized: ${payeeBackfilledCount}`);
    console.log(`     - Modes backfilled: ${modeBackfilledCount}\n`);

    // -------------------------------------------------------------------------
    // 3. Delete duplicate rows, keeping lowest id per (user_id, date, amount, type, description, payee)
    // -------------------------------------------------------------------------
    console.log('Step 3: Deduplicating transactions...');
    const dupCheckRes = await client.query(`
      SELECT user_id, COUNT(*) as count
      FROM transactions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM transactions
        GROUP BY user_id, date, amount, type, LOWER(TRIM(COALESCE(description, ''))), LOWER(TRIM(COALESCE(payee, '')))
      )
      GROUP BY user_id;
    `);

    const dupCountsByUser = new Map();
    for (const r of dupCheckRes.rows) {
      dupCountsByUser.set(r.user_id, parseInt(r.count, 10));
    }

    const delRes = await client.query(`
      DELETE FROM transactions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM transactions
        GROUP BY user_id, date, amount, type, LOWER(TRIM(COALESCE(description, ''))), LOWER(TRIM(COALESCE(payee, '')))
      );
    `);
    console.log(`  -> Removed ${delRes.rowCount} duplicate transaction rows.\n`);

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
    // 5. Safety Assertion: Check per-user row counts
    // -------------------------------------------------------------------------
    console.log('Step 5: Verifying safety invariants and per-user row counts...');
    const postCountRes = await client.query(`
      SELECT user_id, COUNT(*) as count
      FROM transactions
      GROUP BY user_id
      ORDER BY user_id ASC;
    `);

    const afterCounts = new Map();
    for (const r of postCountRes.rows) {
      afterCounts.set(r.user_id, parseInt(r.count, 10));
    }

    console.log('--- Row Counts Comparison (Before vs After) ---');
    for (const [uid, before] of beforeCounts.entries()) {
      const after = afterCounts.get(uid) || 0;
      const expectedDups = dupCountsByUser.get(uid) || 0;
      const actualDrop = before - after;

      console.log(`  User ${uid}: Before=${before} | After=${after} | Dropped=${actualDrop} | Expected Duplicates=${expectedDups}`);

      if (actualDrop > expectedDups) {
        throw new Error(
          `SAFETY VIOLATION: User ${uid} lost ${actualDrop} rows, but only ${expectedDups} duplicates were identified! Aborting.`
        );
      }
    }
    console.log('  -> Safety assertion PASSED: No unexpected row drops detected.\n');

    // Verify index exists
    const idxCheck = await client.query(
      "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_transactions_dedup_hash'"
    );
    if (idxCheck.rows.length === 0) {
      throw new Error('Verification failed: idx_transactions_dedup_hash not found after creation.');
    }

    // -------------------------------------------------------------------------
    // Finalization: Re-enable RLS and Commit / Rollback
    // -------------------------------------------------------------------------
    await client.query('ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE transactions FORCE ROW LEVEL SECURITY;');

    if (isDryRun) {
      await client.query('ROLLBACK');
      console.log('=======================================================');
      console.log('DRY-RUN SUCCESSFUL: All operations completed and ROLLED BACK.');
      console.log('Zero changes were committed to the database.');
      console.log('=======================================================');
    } else {
      await client.query('COMMIT');
      console.log('=======================================================');
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
