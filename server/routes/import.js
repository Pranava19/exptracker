const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db/index');
const auth = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

function autoCategory(desc) {
  const d = desc.toUpperCase();
  if (/ZOMATO|SWIGGY|RESTAURANT|FOOD|HOTEL|CAFE|BAKERY|FRUITS|MALIGAI|STORES|JAI STORES|K K FRUITS/.test(d)) return 'Food';
  if (/OLA|UBER|RAPIDO|PETROL|FUEL|TRANSPORT|BUS|TRAIN|METRO/.test(d)) return 'Transport';
  if (/AMAZON|FLIPKART|MYNTRA|SHOP|MALL|MARKET|THE SIDE/.test(d)) return 'Shopping';
  if (/NETFLIX|PRIME|SPOTIFY|HOTSTAR|GAME|CINEMA|THEATRE|GOOGLE/.test(d)) return 'Entertainment';
  if (/HOSPITAL|PHARMACY|MEDICAL|DOCTOR|HEALTH|APOLLO|CLINIC/.test(d)) return 'Health';
  if (/SALARY|PAYROLL/.test(d)) return 'Salary';
  if (/FREELANCE|UPWORK|FIVERR/.test(d)) return 'Freelance';
  return 'Other';
}

function parseSBIPDF(text) {
  const transactions = [];
  const flat = text.replace(/\s+/g, ' ');
  const txRe = /(\d{2}\/\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+(.*?)(?=\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}|Statement Summary)/g;
  const seen = new Set();

  let match;
  while ((match = txRe.exec(flat)) !== null) {
    const dateStr = match[1];
    const body = match[2].trim();
    const [dd, mm, yyyy] = dateStr.split('/');
    const date = `${yyyy}-${mm}-${dd}`;

    const creditMatch = body.match(/- - ([\d,]+\.\d{2}) [\d,]+\.\d{2}\s*$/);
    const debitMatch  = body.match(/- ([\d,]+\.\d{2}) - [\d,]+\.\d{2}\s*$/);

    let amount = 0, type = '';
    if (creditMatch) {
      amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      type = 'income';
    } else if (debitMatch) {
      amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      type = 'expense';
    } else {
      continue;
    }

    const mode = /UPI/.test(body) ? 'UPI'
      : /ATM|CASH/.test(body) ? 'Cash'
      : /NEFT|RTGS|IMPS/.test(body) ? 'Net Banking'
      : 'Other';

    const desc = body
      .replace(/- - [\d,]+\.\d{2} [\d,]+\.\d{2}\s*$/, '')
      .replace(/- [\d,]+\.\d{2} - [\d,]+\.\d{2}\s*$/, '')
      .trim();

    let payee = '';
    const upiMatch = body.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//);
    if (upiMatch) payee = upiMatch[1].trim();

    if (!amount) continue;

    const key = `${date}|${amount}|${type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({ date, description: desc || 'Unknown', payee, amount, type, category: autoCategory(payee || desc), mode });
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
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c || '').trim().toLowerCase());
    if (row.some(c =>
      c.includes('txn date') || c.includes('transaction date') || c.includes('value date') ||
      c === 'date'
    )) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Could not find transaction header row in Excel');

  const headers  = rows[headerIdx].map(c => String(c || '').trim().toLowerCase());
  const dateCol   = headers.findIndex(h => h.includes('txn date') || h.includes('transaction date') || h.includes('value date') || h === 'date');
  const descCol   = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('details'));
  const debitCol  = headers.findIndex(h => h.includes('debit'));
  const creditCol = headers.findIndex(h => h.includes('credit'));

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[dateCol]) continue;

    const dateRaw = String(row[dateCol] || '').trim();
    const desc    = String(row[descCol]  || '').trim();
    const debit   = parseFloat(String(row[debitCol]  || '').replace(/,/g, '')) || 0;
    const credit  = parseFloat(String(row[creditCol] || '').replace(/,/g, '')) || 0;

    if (!dateRaw || (!debit && !credit)) continue;

    const date = parseDate(dateRaw);
    if (!date) continue;

    let payee = '';
    const upiMatch = desc.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//);
    if (upiMatch) payee = upiMatch[1].trim();

    if (debit  > 0) transactions.push({ date, description: desc, payee, amount: debit,  type: 'expense', category: autoCategory(payee || desc), mode: 'UPI' });
    if (credit > 0) transactions.push({ date, description: desc, payee, amount: credit, type: 'income',  category: autoCategory(payee || desc), mode: 'UPI' });
  }
  return transactions;
}

function parseDate(raw) {
  const s = String(raw).trim();
  const m1 = s.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (m1) {
    const d = new Date(`${m1[2]} ${m1[1]} ${m1[3]}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m2) {
    const d = new Date(`${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
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

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { password } = req.body;
    const buffer = req.file.buffer;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const userId = req.user.id;

    let parsed = [];

    if (ext === '.pdf') {
      const text = await extractPDFText(buffer, password);
      parsed = parseSBIPDF(text);
    } else if (ext === '.xlsx' || ext === '.xls') {
      parsed = await parseExcel(buffer, password);
    } else {
      return res.status(400).json({ message: 'Unsupported file. Upload .xlsx or .pdf' });
    }

    if (parsed.length === 0) {
      return res.status(400).json({ message: 'No transactions found in file. Check the format.' });
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
    console.error('Import error:', err);
    if (err.name === 'PasswordException') {
      return res.status(400).json({ message: 'PDF is password protected. Enter the correct password.' });
    }
    res.status(500).json({ message: err.message || 'Import failed' });
  }
});

module.exports = router;