const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMime = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowedMime.includes(file.mimetype) || ['.pdf', '.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

function autoCategory(desc) {
  if (!desc) return 'Other';
  const d = String(desc).toUpperCase();
  if (/ZOMATO|SWIGGY|RESTAURANT|FOOD|HOTEL|CAFE|BAKERY|FRUITS|MALIGAI|STORES|JAI STORES|K K FRUITS|SUPERMARKET|GROCERY|DUNZO|BIGBASKET|BLINKIT|ZEPTO/.test(d)) return 'Food';
  if (/OLA|UBER|RAPIDO|PETROL|FUEL|TRANSPORT|BUS|TRAIN|METRO|IRCTC|SHELL|HPCL|IOCL|BPCL/.test(d)) return 'Transport';
  if (/AMAZON|FLIPKART|MYNTRA|SHOP|MALL|MARKET|CLOTHES|FASHION|ZARA|H&M|UNIQLO|AJIO/.test(d)) return 'Shopping';
  if (/NETFLIX|PRIME|SPOTIFY|HOTSTAR|GAME|CINEMA|THEATRE|GOOGLE|YOUTUBE|APPLE|STEAM/.test(d)) return 'Entertainment';
  if (/HOSPITAL|PHARMACY|MEDICAL|DOCTOR|HEALTH|APOLLO|CLINIC|LAB|MEDPLUS|PHARMEASY/.test(d)) return 'Health';
  if (/SALARY|PAYROLL|STIPEND|REMUNERATION/.test(d)) return 'Salary';
  if (/FREELANCE|UPWORK|FIVERR|CONSULTING|CLIENT/.test(d)) return 'Freelance';
  return 'Other';
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

  // Handle Excel Serial Number (e.g. 45231)
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  return null;
}

function parseSBIPDF(text) {
  const transactions = [];
  const lines = text.split('\n');
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match DD/MM/YYYY or DD-MM-YYYY date at start of line
    const dateMatch = trimmed.match(/^(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    // Extract numbers with 2 decimal places from the line
    const amountMatches = [...trimmed.matchAll(/([\d,]+\.\d{2})/g)].map(m => parseFloat(m[1].replace(/,/g, '')));
    if (amountMatches.length === 0) continue;

    let amount = 0;
    let type = 'expense';

    if (/CR|CREDIT|\+/i.test(trimmed) && !/DR|DEBIT/i.test(trimmed)) {
      type = 'income';
      amount = amountMatches[0];
    } else if (/DR|DEBIT|\-/i.test(trimmed)) {
      type = 'expense';
      amount = amountMatches[0];
    } else if (amountMatches.length >= 2) {
      // Multiple amounts: description balance amount or debit/credit
      amount = amountMatches[0];
    } else {
      amount = amountMatches[0];
    }

    if (!amount || amount <= 0) continue;

    const desc = trimmed.replace(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/, '').trim();

    let payee = '';
    const upiMatch = desc.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//);
    if (upiMatch) payee = upiMatch[1].trim();

    const mode = /UPI/i.test(desc) ? 'UPI'
      : /ATM|CASH/i.test(desc) ? 'Cash'
      : /NEFT|RTGS|IMPS/i.test(desc) ? 'Net Banking'
      : 'Other';

    const key = `${date}|${amount}|${type}|${desc.slice(0, 20)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({
      date,
      description: desc || 'Bank Transaction',
      payee,
      amount,
      type,
      category: autoCategory(payee || desc),
      mode,
    });
  }

  return transactions;
}

async function parseExcel(buffer, password) {
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
    // Require date column AND at least one of (amount-type column OR description column) in separate cells
    if (hasDate && (hasAmountCol || hasDescCol)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    headerIdx = 0; // Fallback to first row
  }

  const headers = rows[headerIdx].map(c => String(c || '').trim().toLowerCase());
  
  let dateCol = headers.findIndex(h => h.includes('txn date') || h.includes('transaction date') || h.includes('value date') || h.includes('date'));
  let descCol = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('details') || h.includes('remarks') || h.includes('summary'));
  let debitCol = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('spent') || h.includes('outflow') || h.includes('paid out'));
  let creditCol = headers.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('received') || h.includes('inflow') || h.includes('paid in'));
  let amountCol = headers.findIndex(h => h === 'amount' || h.includes('txn amount') || h.includes('transaction amount'));
  let typeCol = headers.findIndex(h => h.includes('type') || h.includes('cr/dr') || h.includes('d/c'));

  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;

  const transactions = [];
  const seen = new Set();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[dateCol]) continue;

    const dateRaw = row[dateCol];
    const date = parseDate(dateRaw);
    if (!date) continue;

    const desc = descCol !== -1 && row[descCol] ? String(row[descCol]).trim() : 'Bank Transaction';

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

    let payee = '';
    const upiMatch = desc.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//);
    if (upiMatch) payee = upiMatch[1].trim();

    const mode = /UPI/i.test(desc) ? 'UPI'
      : /ATM|CASH/i.test(desc) ? 'Cash'
      : /NEFT|RTGS|IMPS/i.test(desc) ? 'Net Banking'
      : 'Other';

    if (debit > 0) {
      const key = `${date}|${debit}|expense|${desc.slice(0, 20)}`;
      if (!seen.has(key)) {
        seen.add(key);
        transactions.push({ date, description: desc, payee, amount: debit, type: 'expense', category: autoCategory(payee || desc), mode });
      }
    }

    if (credit > 0) {
      const key = `${date}|${credit}|income|${desc.slice(0, 20)}`;
      if (!seen.has(key)) {
        seen.add(key);
        transactions.push({ date, description: desc, payee, amount: credit, type: 'income', category: autoCategory(payee || desc), mode });
      }
    }
  }

  return transactions;
}

async function extractPDFText(buffer, password) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password || '',
  });
  const pdf = await loadingTask.promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

router.post(['/', '/import', '/api/import'], auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { password } = req.body;
    const buffer = req.file.buffer;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const userId = req.user.id;

    let parsed = [];

    if (ext === '.pdf') {
      const text = await extractPDFText(buffer, password);
      parsed = parseSBIPDF(text);
    } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      parsed = await parseExcel(buffer, password);
    } else {
      return res.status(400).json({ message: 'Unsupported file format. Please upload .xlsx, .xls, or .pdf' });
    }

    if (parsed.length === 0) {
      return res.status(400).json({ message: 'No transactions found in file. Please ensure it is a valid bank statement.' });
    }

    let inserted = 0, skipped = 0;
    for (const tx of parsed) {
      const dup = await pool.query(
        `SELECT id FROM transactions WHERE user_id=$1 AND date=$2 AND amount=$3 AND type=$4`,
        [userId, tx.date, tx.amount, tx.type]
      );
      if (dup.rows.length > 0) { skipped++; continue; }
      await pool.query(
        `INSERT INTO transactions (user_id, date, amount, description, payee, type, category, mode)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [userId, tx.date, tx.amount, tx.description, tx.payee || '', tx.type, tx.category, tx.mode]
      );
      inserted++;
    }

    res.json({ count: inserted, skipped });
  } catch (err) {
    console.error('Import error:', err.message || err);
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      return res.status(400).json({ message: 'File is password protected. Please enter the correct password.' });
    }
    res.status(500).json({ message: err.message || 'Failed to process statement file.' });
  }
});

module.exports = router;