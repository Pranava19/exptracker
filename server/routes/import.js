const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { importLimiter } = require('../middleware/rateLimiter');
const { cleanPayeeAndCategory, normalizeDescription, getDedupKey } = require('../utils/payeeCleaner');
const logger = require('../utils/logger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowedMime.includes(file.mimetype) || ['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

function normalizeField(val) {
  return String(val || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function makeDedupKey(date, amount, type, description, payee) {
  const d = String(date).slice(0, 10);
  const a = parseFloat(amount).toFixed(2);
  const t = String(type).toLowerCase();
  const desc = normalizeField(description);
  const p = normalizeField(payee);
  return `${d}|${a}|${t}|${desc}|${p}`;
}

function parseDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw)) {
    return raw.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD MMM YYYY or DD-MMM-YYYY (e.g., 15 Aug 2024, 15-Aug-2024)
  const m1 = s.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3})[\s\-]+(\d{4}|\d{2})$/);
  if (m1) {
    const yr = m1[3].length === 2 ? `20${m1[3]}` : m1[3];
    const d = new Date(`${m1[2]} ${m1[1]} ${yr}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})$/);
  if (m2) {
    const yr = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
    const day = m2[1].padStart(2, '0');
    const month = m2[2].padStart(2, '0');
    const d = new Date(`${yr}-${month}-${day}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const m3 = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m3) {
    const d = new Date(`${m3[1]}-${m3[2].padStart(2, '0')}-${m3[3].padStart(2, '0')}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  // Handle Excel Serial Number using UTC epoch
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const d = new Date(excelEpochUtc + Math.round(num * 86400000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  return null;
}

async function parseStatementFile(buffer, password, customRules = [], options = {}) {
  const XLSX = require('xlsx');
  let buf = buffer;

  let opts = {};
  if (typeof options === 'number') {
    opts = { expectedRows: options };
  } else if (options && typeof options === 'object') {
    opts = options;
  }

  const tParseStart = Date.now();
  if (password) {
    const Decryptor = require('officecrypto-tool');
    buf = await Decryptor.decrypt(buffer, { password });
  }

  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheetNames = workbook.SheetNames || [];
  const sheetName = sheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;

  // Recompute the range from actual cell keys instead of trusting !ref
  const origRef = sheet ? sheet['!ref'] : null;
  let minRow = Infinity, maxRow = -1;
  let minCol = Infinity, maxCol = -1;

  if (sheet) {
    for (const key of Object.keys(sheet)) {
      if (key.charCodeAt(0) === 33) continue; // Skip keys starting with '!' like '!ref'
      const cell = XLSX.utils.decode_cell(key);
      if (cell.r < minRow) minRow = cell.r;
      if (cell.r > maxRow) maxRow = cell.r;
      if (cell.c < minCol) minCol = cell.c;
      if (cell.c > maxCol) maxCol = cell.c;
    }
  }

  let computedRef = origRef;
  let recomputedRange = null;

  if (maxRow >= 0 && maxCol >= 0) {
    const sRow = minRow === Infinity ? 0 : minRow;
    const sCol = minCol === Infinity ? 0 : minCol;
    recomputedRange = { s: { r: sRow, c: sCol }, e: { r: maxRow, c: maxCol } };
    computedRef = XLSX.utils.encode_range(recomputedRange);
    sheet['!ref'] = computedRef;
  }

  // 1. Log: workbook sheet names, sheet !ref, last row index in the sheet
  logger.info(
    `[Import Parser] SheetNames: ${JSON.stringify(sheetNames)}, Orig !ref: ${origRef}, Recomputed !ref: ${computedRef}, Last row index: ${maxRow} (1-based: ${maxRow + 1})`
  );
  console.log(
    `[Import Parser] SheetNames: ${JSON.stringify(sheetNames)}, Orig !ref: ${origRef}, Recomputed !ref: ${computedRef}, Last row index: ${maxRow} (1-based: ${maxRow + 1})`
  );

  const rows = sheet ? XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    range: recomputedRange || sheet['!ref'],
  }) : [];

  const tParseEnd = Date.now();
  const parseElapsedMs = tParseEnd - tParseStart;

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (!rows[i] || !Array.isArray(rows[i])) continue;
    const row = rows[i].map(c => String(c || '').trim().toLowerCase());
    const hasDate = row.some(c => c === 'date' || c.includes('txn date') || c.includes('transaction date') || c.includes('value date'));
    const hasAmountCol = row.some(c =>
      c.includes('debit') || c.includes('credit') || c.includes('withdrawal') ||
      c.includes('deposit') || c.includes('amount')
    );
    const hasDescCol = row.some(c =>
      c.includes('narration') || c.includes('description') || c.includes('particulars') || c.includes('details')
    );
    if (hasDate && (hasAmountCol || hasDescCol)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) headerIdx = 0;

  const headers = rows[headerIdx] ? rows[headerIdx].map(c => String(c || '').trim().toLowerCase()) : [];
  let dateCol = headers.findIndex(h => h.includes('txn date') || h.includes('transaction date') || h.includes('value date') || h.includes('date'));
  let descCol = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('details') || h.includes('remarks') || h.includes('summary'));
  let debitCol = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('spent') || h.includes('outflow') || h.includes('paid out'));
  let creditCol = headers.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('received') || h.includes('inflow') || h.includes('paid in'));
  let balanceCol = headers.findIndex(h => h.includes('balance'));
  let amountCol = headers.findIndex(h => h === 'amount' || h.includes('txn amount') || h.includes('transaction amount'));
  let typeCol = headers.findIndex(h => h.includes('type') || h.includes('cr/dr') || h.includes('d/c'));

  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;

  const transactions = [];
  const skipped = [];
  const seen = new Set();
  let totalDebit = 0;
  let totalCredit = 0;
  let runningBalance = 0;
  let balanceMismatches = 0;
  let lastRowBalance = null;
  let totalRowsRead = 0;

  let firstStopRow = null;
  let firstStopReason = null;

  const tMatchStart = Date.now();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;

    // Use continue (never break) for non-transaction rows, logging each skipped line and reason
    if (!row || !Array.isArray(row) || row.every(c => c === undefined || c === null || String(c).trim() === '')) {
      const reason = 'Empty row';
      if (!firstStopRow) { firstStopRow = line; firstStopReason = reason; }
      logger.info(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      console.log(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      continue;
    }

    totalRowsRead++;

    if (!row[dateCol]) {
      const reason = 'Missing date';
      if (!firstStopRow) { firstStopRow = line; firstStopReason = reason; }
      logger.info(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      console.log(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      skipped.push({ line, reason });
      continue;
    }

    const date = parseDate(row[dateCol]);
    if (!date) {
      const reason = `Invalid date format: ${row[dateCol]}`;
      if (!firstStopRow) { firstStopRow = line; firstStopReason = reason; }
      logger.info(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      console.log(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      skipped.push({ line, reason });
      continue;
    }

    const rawDesc = descCol !== -1 && row[descCol] ? String(row[descCol]) : 'Bank Transaction';

    let debit = 0, credit = 0;
    if (debitCol !== -1 && row[debitCol] !== undefined && row[debitCol] !== null && row[debitCol] !== '') {
      debit = Math.abs(parseFloat(String(row[debitCol]).replace(/,/g, ''))) || 0;
    }
    if (creditCol !== -1 && row[creditCol] !== undefined && row[creditCol] !== null && row[creditCol] !== '') {
      credit = Math.abs(parseFloat(String(row[creditCol]).replace(/,/g, ''))) || 0;
    }

    if (debit === 0 && credit === 0 && amountCol !== -1 && row[amountCol]) {
      const amtVal = parseFloat(String(row[amountCol]).replace(/,/g, '')) || 0;
      const typeVal = typeCol !== -1 && row[typeCol] ? String(row[typeCol]).toUpperCase() : '';
      if (typeVal.includes('CR') || typeVal.includes('CREDIT') || amtVal > 0) {
        credit = Math.abs(amtVal);
      } else {
        debit = Math.abs(amtVal);
      }
    }

    if (debit <= 0 && credit <= 0) {
      const reason = 'Missing or zero debit and credit amounts';
      if (!firstStopRow) { firstStopRow = line; firstStopReason = reason; }
      logger.info(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      console.log(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      skipped.push({ line, reason });
      continue;
    }

    totalDebit += debit;
    totalCredit += credit;

    const type = debit > 0 ? 'expense' : 'income';
    const amount = debit > 0 ? debit : credit;

    if (balanceCol !== -1 && row[balanceCol] !== undefined && row[balanceCol] !== null && row[balanceCol] !== '') {
      const rowBal = parseFloat(String(row[balanceCol]).replace(/,/g, ''));
      if (!isNaN(rowBal)) {
        lastRowBalance = rowBal;
        const expected = Math.round((runningBalance + credit - debit) * 100) / 100;
        if (Math.abs(expected - rowBal) > 0.01) {
          balanceMismatches++;
        }
        runningBalance = rowBal;
      }
    } else {
      runningBalance = Math.round((runningBalance + credit - debit) * 100) / 100;
    }

    const cleaned = cleanPayeeAndCategory(rawDesc, null, customRules, type);
    const dedupKey = getDedupKey(date, amount, type, rawDesc);

    if (seen.has(dedupKey)) {
      const reason = 'Duplicate transaction within statement file';
      if (!firstStopRow) { firstStopRow = line; firstStopReason = reason; }
      logger.info(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      console.log(`[Import Parser] Skipped row at line ${line}: ${reason}`);
      skipped.push({ line, reason });
      continue;
    }

    seen.add(dedupKey);
    transactions.push({
      line,
      date,
      description: cleaned.cleanDescription,
      payee: cleaned.payee,
      amount,
      type,
      category: cleaned.category,
      mode: cleaned.mode,
      balance: runningBalance,
      dedupKey,
      rawDesc,
    });
  }

  // 1. Log the first row where the loop skips/stops or completion status
  if (firstStopRow) {
    logger.info(`[Import Parser] First non-transaction/skipped row: line ${firstStopRow}, reason: ${firstStopReason}`);
    console.log(`[Import Parser] First non-transaction/skipped row: line ${firstStopRow}, reason: ${firstStopReason}`);
  } else {
    logger.info(`[Import Parser] Loop processed all ${rows.length} rows to the end (last row line ${rows.length}) with no early stops.`);
    console.log(`[Import Parser] Loop processed all ${rows.length} rows to the end (last row line ${rows.length}) with no early stops.`);
  }

  const tMatchEnd = Date.now();
  const ruleMatchingElapsedMs = tMatchEnd - tMatchStart;

  // 4. Reconcile using the balance column of the last transaction row
  const lastTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
  const closingBalance = (lastTx && lastTx.balance !== undefined && lastTx.balance !== null)
    ? lastTx.balance
    : (lastRowBalance !== null ? lastRowBalance : runningBalance);

  const reconciled = balanceMismatches === 0 && Math.abs(runningBalance - closingBalance) < 0.01;

  // 4. Fail loudly if parsed rows != expected rows
  const expRows = opts.expectedRows !== undefined && opts.expectedRows !== null && opts.expectedRows !== ''
    ? Number(opts.expectedRows)
    : (opts.expected_rows !== undefined && opts.expected_rows !== null && opts.expected_rows !== ''
      ? Number(opts.expected_rows)
      : null);

  if (expRows !== null && !isNaN(expRows)) {
    if (transactions.length !== expRows) {
      const errMsg = `Statement reconciliation failed: parsed ${transactions.length} transaction rows, but expected ${expRows} rows.`;
      logger.error(errMsg);
      console.error(errMsg);
      const err = new Error(errMsg);
      err.status = 400;
      throw err;
    }
  }

  return {
    totalRows: transactions.length,
    totalRowsRead,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance: Math.round(closingBalance * 100) / 100,
    reconciled,
    balanceMismatches,
    transactions,
    skipped,
    parseElapsedMs,
    ruleMatchingElapsedMs,
    sheetNames,
    origRef,
    computedRef,
    maxRow,
  };
}

// POST /api/import/preview - Inspect parsed records before importing
router.post(['/preview', '/api/import/preview'], auth, importLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'File upload error' });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const userId = req.user.id;
    const { password } = req.body;
    const buffer = req.file.buffer;

    // Load payee_rules once and match in memory
    const rulesRes = await pool.query('SELECT pattern, display_name, category FROM payee_rules WHERE user_id = $1', [userId]);
    const customRules = rulesRes.rows || [];

    const expectedRows = req.body?.expectedRows || req.body?.expected_rows || req.query?.expectedRows;
    const parsedData = await parseStatementFile(buffer, password, customRules, { expectedRows });
    if (parsedData.totalRows === 0 && parsedData.skipped.length === 0) {
      return res.status(400).json({ message: 'No valid transactions found in statement file' });
    }

    // Query existing transactions to flag duplicates
    let duplicateCount = 0;
    let previewList = [];

    if (parsedData.transactions.length > 0) {
      let minDate = parsedData.transactions[0].date;
      let maxDate = parsedData.transactions[0].date;
      for (const tx of parsedData.transactions) {
        if (tx.date < minDate) minDate = tx.date;
        if (tx.date > maxDate) maxDate = tx.date;
      }

      const existingRes = await pool.query(
        `SELECT date::text AS date, amount, type, 
                lower(TRIM(COALESCE(description, ''))) AS norm_desc,
                lower(TRIM(COALESCE(payee, ''))) AS norm_payee
         FROM transactions 
         WHERE user_id = $1 AND date >= $2::date AND date <= $3::date`,
        [userId, minDate, maxDate]
      );

      const existingSet = new Set(
        existingRes.rows.map(r => makeDedupKey(r.date, r.amount, r.type, r.norm_desc, r.norm_payee))
      );

      previewList = parsedData.transactions.map(tx => {
        const k = makeDedupKey(tx.date, tx.amount, tx.type, tx.description, tx.payee);
        const isDuplicate = existingSet.has(k);
        if (isDuplicate) duplicateCount++;
        return {
          ...tx,
          is_duplicate: isDuplicate,
        };
      });
    }

    res.json({
      totalRows: parsedData.totalRows,
      newCount: parsedData.totalRows - duplicateCount,
      duplicateCount,
      totalDebit: parsedData.totalDebit,
      totalCredit: parsedData.totalCredit,
      closingBalance: parsedData.closingBalance,
      reconciled: parsedData.reconciled,
      transactions: previewList,
      skipped: parsedData.skipped,
    });
  } catch (err) {
    console.error('Import preview error:', err.message);
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      return res.status(400).json({ message: 'File is password protected. Please provide the correct password.' });
    }
    res.status(500).json({ message: err.message || 'Failed to preview statement file' });
  }
});

// POST /api/import - Execute statement import
router.post(['/', '/import', '/api/import'], auth, importLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'File upload error' });
    next();
  });
}, async (req, res) => {
  let client;
  let isCommitted = false;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { password } = req.body;
    const buffer = req.file.buffer;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const userId = req.user.id;

    if (!['.xlsx', '.xls'].includes(ext)) {
      return res.status(400).json({ message: 'Unsupported file format. Please upload an Excel file (.xlsx or .xls)' });
    }

    // 1. Load payee_rules once and match in memory
    const tRulesStart = Date.now();
    const rulesRes = await pool.query(
      'SELECT pattern, display_name, category FROM payee_rules WHERE user_id = $1',
      [userId]
    );
    const customRules = rulesRes.rows || [];
    const tRulesEnd = Date.now();
    const ruleLoadMs = tRulesEnd - tRulesStart;

    // 2. File decrypt & parse
    const expectedRows = req.body?.expectedRows || req.body?.expected_rows || req.query?.expectedRows;
    const parsedData = await parseStatementFile(buffer, password, customRules, { expectedRows });
    const { transactions, skipped: fileSkipped, totalRowsRead, parseElapsedMs, ruleMatchingElapsedMs } = parsedData;

    if (transactions.length === 0 && fileSkipped.length === 0) {
      return res.status(400).json({ message: 'No transactions found in file. Please ensure it is a valid bank statement.' });
    }

    const skipped = [...fileSkipped];
    const toInsert = [];

    // 3. One duplicate query for the date range
    const tDupStart = Date.now();
    if (transactions.length > 0) {
      let minDate = transactions[0].date;
      let maxDate = transactions[0].date;
      for (const tx of transactions) {
        if (tx.date < minDate) minDate = tx.date;
        if (tx.date > maxDate) maxDate = tx.date;
      }

      const existingRes = await pool.query(
        `SELECT 
           date::text AS date, 
           amount, 
           type, 
           lower(TRIM(COALESCE(description, ''))) AS norm_desc,
           lower(TRIM(COALESCE(payee, ''))) AS norm_payee
         FROM transactions 
         WHERE user_id = $1 
           AND date >= $2::date 
           AND date <= $3::date`,
        [userId, minDate, maxDate]
      );

      const existingSet = new Set(
        existingRes.rows.map(r => makeDedupKey(r.date, r.amount, r.type, r.norm_desc, r.norm_payee))
      );

      for (const tx of transactions) {
        const key = makeDedupKey(tx.date, tx.amount, tx.type, tx.description, tx.payee);
        if (existingSet.has(key)) {
          skipped.push({ line: tx.line, reason: 'Duplicate transaction already in database' });
        } else {
          toInsert.push(tx);
          existingSet.add(key);
        }
      }
    }
    const tDupEnd = Date.now();
    const dupCheckMs = tDupEnd - tDupStart;

    // 4. Batched insert in chunks of 500 inside a single transaction
    const tInsertStart = Date.now();
    let inserted = 0;
    const BATCH_SIZE = 500;

    if (toInsert.length > 0) {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.user_id', $1, true)", [String(userId)]);

      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const valueClauses = [];
        const params = [userId];
        let pIdx = 2;

        for (const tx of batch) {
          valueClauses.push(
            `($1, $${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6})`
          );
          params.push(
            tx.date,
            tx.amount,
            tx.description,
            tx.payee || '',
            tx.type,
            tx.category,
            tx.mode || 'Other'
          );
          pIdx += 7;
        }

        const query = `
          INSERT INTO transactions (user_id, date, amount, description, payee, type, category, mode)
          VALUES ${valueClauses.join(', ')}
          ON CONFLICT DO NOTHING
          RETURNING id;
        `;

        const result = await client.query(query, params);
        inserted += result.rowCount;
      }

      await client.query('COMMIT');
      isCommitted = true;
    }
    const tInsertEnd = Date.now();
    const insertElapsedMs = tInsertEnd - tInsertStart;

    // Sort skipped rows by line number for deterministic readability
    skipped.sort((a, b) => (a.line || 0) - (b.line || 0));

    const totalParsed = totalRowsRead > 0 ? totalRowsRead : (transactions.length + fileSkipped.length);

    // Logging (Requirement 2: Log elapsed ms for file decrypt/parse, rule matching, insert, and row counts)
    logger.info(
      `[Import] File decrypt/parse: ${parseElapsedMs}ms | Rule matching: ${ruleMatchingElapsedMs}ms | Insert: ${insertElapsedMs}ms | Total rows read: ${totalParsed} | Rows inserted: ${inserted}`
    );
    console.log(`[Import] Elapsed: file decrypt/parse: ${parseElapsedMs}ms, rule matching: ${ruleMatchingElapsedMs}ms, insert: ${insertElapsedMs}ms`);
    console.log(`[Import] Total rows read: ${totalParsed}, rows inserted: ${inserted}, skipped: ${skipped.length}`);

    // Do not abort work when the client disconnects (Requirement 4)
    if (!res.headersSent && !res.writableEnded && !res.destroyed) {
      try {
        // Return { parsed, inserted, skipped: [{ line, reason }] } plus totalRows, closingBalance, reconciled
        res.json({
          parsed: totalParsed,
          inserted,
          count: inserted,
          totalRows: transactions.length,
          totalDebit: parsedData.totalDebit,
          totalCredit: parsedData.totalCredit,
          closingBalance: parsedData.closingBalance,
          reconciled: parsedData.reconciled,
          skipped,
        });
      } catch (sendErr) {
        logger.warn('[Import] Client disconnected before response could be sent: %s', sendErr.message);
      }
    } else {
      logger.warn('[Import] Client disconnected during import. Process completed: %d inserted, %d skipped.', inserted, skipped.length);
    }
  } catch (err) {
    if (client && !isCommitted) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error('Rollback error:', rbErr.message); }
    }
    if (isCommitted) {
      logger.warn('[Import] Handled error after commit: %s', err.message);
      return;
    }
    console.error('Import error:', err.message || err);
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      return res.status(400).json({ message: 'File is password protected. Please enter the correct password.' });
    }
    res.status(500).json({ message: err.message || 'Failed to process statement file.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
module.exports.parseStatementFile = parseStatementFile;
module.exports.parseDate = parseDate;