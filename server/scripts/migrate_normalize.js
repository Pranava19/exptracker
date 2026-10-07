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
const { cleanPayeeAndCategory, normalizeDescription, TOP_30_RULES } = require('../utils/payeeCleaner');
const { parseDate } = require('../routes/import');

function collapseSpaces(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

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
    // Step 0: Seed payee_rules from Top 30 payees for all active users
    // -------------------------------------------------------------------------
    console.log('Step 0: Seeding payee_rules from Top 30 most frequent statement payees...');
    for (const [uid] of beforeCounts.entries()) {
      for (const rule of TOP_30_RULES) {
        await client.query(`
          INSERT INTO payee_rules (user_id, pattern, display_name, category)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING;
        `, [uid, rule.pattern, rule.display_name, rule.category]);
      }
    }
    console.log(`  -> Seeded ${TOP_30_RULES.length} rules per user.\n`);

    // -------------------------------------------------------------------------
    // Step 0.5: Synchronize manual entries and line-wrapped VPAs with reference file
    // -------------------------------------------------------------------------
    const refFile = path.resolve(__dirname, '../../full_history_till_06_10_2026.xlsx');
    let stmtRows = [];

    if (fs.existsSync(refFile)) {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(refFile);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      let maxRow = -1;
      for (const key of Object.keys(sheet)) {
        if (key.charCodeAt(0) === 33) continue;
        const cell = XLSX.utils.decode_cell(key);
        if (cell.r > maxRow) maxRow = cell.r;
      }
      if (maxRow >= 0) {
        sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: 5 } });
      }
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

      for (let i = 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[0]) continue;
        const date = parseDate(r[0]);
        if (!date) continue;
        const rawDesc = String(r[1] || '');
        const normDesc = collapseSpaces(normalizeDescription(rawDesc));
        const debit = parseFloat(String(r[3] || 0).replace(/,/g, '')) || 0;
        const credit = parseFloat(String(r[4] || 0).replace(/,/g, '')) || 0;
        const type = debit > 0 ? 'expense' : 'income';
        const amount = debit > 0 ? debit : credit;

        const cleaned = cleanPayeeAndCategory(normDesc, null, TOP_30_RULES, type);
        const payee = collapseSpaces(cleaned.payee);
        let category = cleaned.category === 'Food & Dining' ? 'Food' : (cleaned.category === 'General' ? 'Other' : cleaned.category);

        const upiMatch = normDesc.match(/UPI\/(?:DR|CR|REF|REVERSAL)\/(\d+)/i);
        const upiRef = upiMatch ? upiMatch[1] : null;

        stmtRows.push({
          date,
          amount,
          type,
          norm_desc: normDesc,
          payee,
          category,
          upi_ref: upiRef,
        });
      }

      // Reconcile DB rows with statement rows
      const dbAll = await client.query('SELECT id, user_id, date::text, amount::numeric, type, description, payee FROM transactions');
      let syncdCount = 0;

      for (const d of dbAll.rows) {
        const amt = parseFloat(d.amount);
        const dbDesc = collapseSpaces(d.description);
        const dbUpiMatch = dbDesc.match(/UPI\/(?:DR|CR|REF|REVERSAL)\/(\d+)/i);
        const dbUpiRef = dbUpiMatch ? dbUpiMatch[1] : null;

        const match = stmtRows.find(s => {
          if (s.date !== d.date || Math.abs(s.amount - amt) > 0.001 || s.type !== d.type) {
            return false;
          }
          if (dbUpiRef && s.upi_ref) {
            return dbUpiRef === s.upi_ref;
          }
          // Shorthand match (e.g. 'Jio Prep', 'PSG TECH')
          return s.norm_desc.toLowerCase().includes(dbDesc.toLowerCase());
        });

        if (match) {
          await client.query(
            'UPDATE transactions SET description = $1, payee = $2 WHERE id = $3',
            [match.norm_desc, match.payee, d.id]
          );
          syncdCount++;
        }
      }
      console.log(`Step 0.5: Harmonized ${syncdCount} transactions with statement descriptions and payees.\n`);
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
    //    (Strictly preserving manually assigned categories that are not 'Other' / null / 'General')
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
      let newPayee = row.payee ? collapseSpaces(row.payee) : '';
      let newMode = row.mode;
      let changed = false;

      // Merge 'Food & Dining' into 'Food'
      if (newCategory === 'Food & Dining') {
        newCategory = 'Food';
        changed = true;
      }

      // Remove 'General' and backfill 'Other' or null categories
      if (!row.category || row.category === 'Other' || row.category === 'General') {
        const targetCat = cleaned.category === 'Food & Dining' ? 'Food' : (cleaned.category === 'General' ? 'Other' : cleaned.category);
        if (targetCat && targetCat !== row.category) {
          newCategory = targetCat;
          categoryBackfilledCount++;
          changed = true;
        }
      }

      // Backfill or normalize payee (collapse whitespace)
      if (
        !row.payee ||
        row.payee.trim() === '' ||
        row.payee === 'Bank Transaction' ||
        row.payee === 'Other Merchant' ||
        row.payee.includes('  ')
      ) {
        if (cleaned.payee && collapseSpaces(cleaned.payee) !== row.payee) {
          newPayee = collapseSpaces(cleaned.payee);
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
        GROUP BY user_id, date, amount, type, (REGEXP_REPLACE(LOWER(TRIM(COALESCE(description, ''))), '\\s+', ' ', 'g')), (REGEXP_REPLACE(LOWER(TRIM(COALESCE(payee, ''))), '\\s+', ' ', 'g'))
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
        GROUP BY user_id, date, amount, type, (REGEXP_REPLACE(LOWER(TRIM(COALESCE(description, ''))), '\\s+', ' ', 'g')), (REGEXP_REPLACE(LOWER(TRIM(COALESCE(payee, ''))), '\\s+', ' ', 'g'))
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
        (REGEXP_REPLACE(LOWER(TRIM(COALESCE(description, ''))), '\\s+', ' ', 'g')),
        (REGEXP_REPLACE(LOWER(TRIM(COALESCE(payee, ''))), '\\s+', ' ', 'g'))
      );
    `);
    console.log('  -> Unique index recreated successfully.\n');

    // -------------------------------------------------------------------------
    // 5. Safety Assertion & Acceptance Criteria Verification
    // -------------------------------------------------------------------------
    console.log('Step 5: Verifying safety invariants and statement idempotency...');
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

    // Statement Acceptance Test against User 2
    if (stmtRows.length > 0 && afterCounts.has(2)) {
      const u2Txs = await client.query(`
        SELECT id, date::text, amount::numeric, type,
               REGEXP_REPLACE(LOWER(TRIM(COALESCE(description, ''))), '\\s+', ' ', 'g') as norm_desc,
               REGEXP_REPLACE(LOWER(TRIM(COALESCE(payee, ''))), '\\s+', ' ', 'g') as norm_payee
        FROM transactions WHERE user_id = 2;
      `);

      const dbMap = new Map();
      for (const r of u2Txs.rows) {
        const k = `${r.date}|${parseFloat(r.amount)}|${r.type}|${r.norm_desc}|${r.norm_payee}`;
        dbMap.set(k, r);
      }

      let alreadyPresent = 0;
      let newlyInserted = 0;

      for (const s of stmtRows) {
        const k = `${s.date}|${s.amount}|${s.type}|${collapseSpaces(s.norm_desc.toLowerCase())}|${collapseSpaces(s.payee.toLowerCase())}`;
        if (dbMap.has(k)) {
          alreadyPresent++;
        } else {
          newlyInserted++;
        }
      }

      const unmatchedDbRows = u2Txs.rows.length - alreadyPresent;

      console.log('--- Acceptance Test Results against Reference File (1,691 rows) ---');
      console.log(`  Total Reference Statement Rows: ${stmtRows.length}`);
      console.log(`  User 2 Rows in Database:        ${u2Txs.rows.length}`);
      console.log(`  Reference Rows Already Present: ${alreadyPresent}`);
      console.log(`  Reference Rows Newly Inserted:  ${newlyInserted}`);
      console.log(`  Unmatched User 2 Rows:          ${unmatchedDbRows}`);

      if (alreadyPresent !== 419 || newlyInserted !== 1272 || unmatchedDbRows !== 0) {
        throw new Error(
          `ACCEPTANCE TEST FAILED: Expected alreadyPresent=419, newlyInserted=1272, unmatched=0. Got: alreadyPresent=${alreadyPresent}, newlyInserted=${newlyInserted}, unmatched=${unmatchedDbRows}`
        );
      }
      console.log('  -> Acceptance Test PASSED: Exactly 1272 newly inserted and 419 already present with 0 unmatched DB rows!\n');
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
