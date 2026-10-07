const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');
const { importLimiter } = require('../middleware/rateLimiter');
const { cleanPayeeAndCategory, normalizeDescription, getDedupKey } = require('../utils/payeeCleaner');

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

async function parseStatementFile(buffer, password, customRules = []) {
  const XLSX = require('xlsx');
  let buf = buffer;

  if (password) {
    const Decryptor = require('officecrypto-tool');
    buf = await Decryptor.decrypt(buffer, { password });
  }

  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

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

  const headers = rows[headerIdx].map(c => String(c || '').trim().toLowerCase());
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
  const seen = new Set();
  let totalDebit = 0;
  let totalCredit = 0;
  let runningBalance = 0;
  let balanceMismatches = 0;
  let lastRowBalance = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[dateCol]) continue;

    const date = parseDate(row[dateCol]);
    if (!date) continue;

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

    if (debit <= 0 && credit <= 0) continue;

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

    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      transactions.push({
        date,
        description: cleaned.cleanDescription,
        payee: cleaned.payee,
        amount,
        type,
        category: cleaned.category,
        mode: cleaned.mode,
        balance: runningBalance,
        dedupKey,
      });
    }
  }

  return {
    totalRows: transactions.length,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance: lastRowBalance !== null ? lastRowBalance : runningBalance,
    reconciled: balanceMismatches === 0,
    balanceMismatches,
    transactions,
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

    // Fetch custom user rules if any
    const rulesRes = await pool.query('SELECT pattern, display_name, category FROM payee_rules WHERE user_id = $1', [userId]);
    const customRules = rulesRes.rows || [];

    const parsedData = await parseStatementFile(buffer, password, customRules);
    if (parsedData.totalRows === 0) {
      return res.status(400).json({ message: 'No valid transactions found in statement file' });
    }

    // Query existing transactions to flag duplicates
    const existingRes = await pool.query(
      `SELECT date::text as date, amount, type, LOWER(TRIM(COALESCE(description, ''))) as description, LOWER(TRIM(COALESCE(payee, ''))) as payee 
       FROM transactions WHERE user_id = $1`,
      [userId]
    );

    const existingSet = new Set(
      existingRes.rows.map(r => `${r.date}|${parseFloat(r.amount)}|${r.type}|${r.description}|${r.payee}`)
    );

    let duplicateCount = 0;
    const previewList = parsedData.transactions.map(tx => {
      const matchKey = `${tx.date}|${tx.amount}|${tx.type}|${tx.description.toLowerCase().trim()}|${(tx.payee || '').toLowerCase().trim()}`;
      const isDuplicate = existingSet.has(matchKey);
      if (isDuplicate) duplicateCount++;
      return {
        ...tx,
        is_duplicate: isDuplicate,
      };
    });

    res.json({
      totalRows: parsedData.totalRows,
      newCount: parsedData.totalRows - duplicateCount,
      duplicateCount,
      totalDebit: parsedData.totalDebit,
      totalCredit: parsedData.totalCredit,
      closingBalance: parsedData.closingBalance,
      reconciled: parsedData.reconciled,
      transactions: previewList,
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

    // Fetch user rules if any
    const rulesRes = await pool.query('SELECT pattern, display_name, category FROM payee_rules WHERE user_id = $1', [userId]);
    const customRules = rulesRes.rows || [];

    const parsedData = await parseStatementFile(buffer, password, customRules);
    const transactions = parsedData.transactions;

    if (transactions.length === 0) {
      return res.status(400).json({ message: 'No transactions found in file. Please ensure it is a valid bank statement.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [String(userId)]);

    let inserted = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
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
        ON CONFLICT (user_id, date, amount, type, (REGEXP_REPLACE(LOWER(TRIM(COALESCE(description, ''))), '\s+', ' ', 'g')), (REGEXP_REPLACE(LOWER(TRIM(COALESCE(payee, ''))), '\s+', ' ', 'g')))
        DO NOTHING
        RETURNING id;
      `;

      const result = await client.query(query, params);
      inserted += result.rowCount;
    }

    await client.query('COMMIT');

    const skipped = transactions.length - inserted;

    res.json({
      count: inserted,
      skipped,
      totalRows: transactions.length,
      totalDebit: parsedData.totalDebit,
      totalCredit: parsedData.totalCredit,
      closingBalance: parsedData.closingBalance,
      reconciled: parsedData.reconciled,
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rbErr) { console.error('Rollback error:', rbErr.message); }
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