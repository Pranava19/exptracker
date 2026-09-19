const test = require('node:test');
const assert = require('node:assert');
const importRouter = require('../routes/import');
const isHeaderRow = importRouter.isHeaderRow;

test('header detection tests', () => {
  // 1. SBI-style metadata rows must NOT match
  assert.strictEqual(isHeaderRow(['State Bank of India']), false);
  assert.strictEqual(isHeaderRow(['Account Statement']), false);
  assert.strictEqual(isHeaderRow(['Account Number: 1234567890']), false);

  // 2. "Date of Statement" metadata row must NOT match (single cell or <3 non-empty cells)
  assert.strictEqual(isHeaderRow(['Date of Statement : 06-06-2026']), false);
  assert.strictEqual(isHeaderRow(['Date of Statement : 06-06-2026', '']), false);

  // 3. No-header sheet rows / random data rows must NOT match
  assert.strictEqual(isHeaderRow(['15/08/2024', 'UPI Transfer', '100.00']), false);
  assert.strictEqual(isHeaderRow(['15/08/2024', 'GROCERIES', '500.00', 'COMPLETED']), false);

  // 4. Real valid table header rows MUST match
  assert.strictEqual(
    isHeaderRow(['Txn Date', 'Value Date', 'Description', 'Ref No', 'Debit', 'Credit', 'Balance']),
    true
  );
  assert.strictEqual(
    isHeaderRow(['tran date', 'particulars', 'amount', 'type']),
    true
  );
  assert.strictEqual(
    isHeaderRow(['posting date', 'narrative', 'withdrawal', 'deposit']),
    true
  );
  assert.strictEqual(
    isHeaderRow(['txn dt', 'details', 'spent']),
    true
  );
});
