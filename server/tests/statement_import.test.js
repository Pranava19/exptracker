const path = require('path');
const fs = require('fs');
const { parseStatementFile } = require('../routes/import');
const { cleanPayeeAndCategory, getDedupKey } = require('../utils/payeeCleaner');

describe('Step 2: Statement Import & Reconciliation Tests', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/statement_fixture.xlsx');
  let fixtureBuffer;
  let parsedResult;

  beforeAll(async () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    fixtureBuffer = fs.readFileSync(fixturePath);
    parsedResult = await parseStatementFile(fixtureBuffer);
  });

  test('Condition 1: Exactly 1,691 data rows are parsed from the statement', () => {
    expect(parsedResult.totalRows).toBe(1691);
    expect(parsedResult.transactions).toHaveLength(1691);
  });

  test('Condition 2: Sum of debits and credits match sheet totals exactly', () => {
    expect(parsedResult.totalDebit).toBe(822466.74);
    expect(parsedResult.totalCredit).toBe(822812.67);
  });

  test('Condition 3: Balance reconciles perfectly with closing balance of ₹345.93', () => {
    expect(parsedResult.reconciled).toBe(true);
    expect(parsedResult.balanceMismatches).toBe(0);
    expect(parsedResult.closingBalance).toBe(345.93);
  });

  test('Condition 4: Deduplication keys are unique across all rows and idempotent on re-import', () => {
    const dedupSet = new Set();
    for (const tx of parsedResult.transactions) {
      expect(dedupSet.has(tx.dedupKey)).toBe(false);
      dedupSet.add(tx.dedupKey);
    }
    expect(dedupSet.size).toBe(1691);

    // Second import simulation: all rows in a second pass match existing keys
    let secondImportInserted = 0;
    let secondImportSkipped = 0;
    for (const tx of parsedResult.transactions) {
      if (dedupSet.has(tx.dedupKey)) {
        secondImportSkipped++;
      } else {
        secondImportInserted++;
      }
    }
    expect(secondImportInserted).toBe(0);
    expect(secondImportSkipped).toBe(1691);
  });

  test('Condition 5: Every single row has non-null category, type, mode, and normalized description', () => {
    for (const [idx, tx] of parsedResult.transactions.entries()) {
      expect(tx.category).toBeTruthy();
      expect(typeof tx.category).toBe('string');
      expect(tx.category.trim().length).toBeGreaterThan(0);

      expect(['income', 'expense']).toContain(tx.type);

      expect(['UPI', 'Cash', 'Card', 'Other', 'Net Banking']).toContain(tx.mode);

      expect(tx.description).toBeTruthy();
      expect(typeof tx.description).toBe('string');
      // Description must be normalized without \r\n or runs of multiple spaces or raw CIF numbers
      expect(tx.description).not.toMatch(/\r|\n/);
      expect(tx.description).not.toMatch(/\s{2,}/);
      expect(tx.description).not.toMatch(/CIF:\s*\d+/i);
    }
  });

  test('Condition 6: All UPI rows have clean, non-empty payee and correct classification', () => {
    const upiRows = parsedResult.transactions.filter(t => t.mode === 'UPI' || t.description.includes('UPI/'));
    expect(upiRows.length).toBeGreaterThan(1600);

    for (const tx of upiRows) {
      expect(tx.payee).toBeTruthy();
      expect(typeof tx.payee).toBe('string');
      expect(tx.payee.trim().length).toBeGreaterThan(0);
      expect(tx.payee).not.toBe('Bank Transaction');
      // Payee should not contain raw slashes or UPI protocol markers
      expect(tx.payee).not.toMatch(/^UPI\//);
    }
  });

  test('Condition 7: Recovers from truncated !ref (e.g. A1:F1517), parsing all 1,691 rows past 13/07/2026 to closing balance 345.93', async () => {
    const JSZip = require('jszip');
    // Load workbook zip and deliberately tamper with <dimension ref="..." /> in XML to simulate the bug
    const zip = await JSZip.loadAsync(fixtureBuffer);
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('text');
    const tamperedXml = sheetXml.replace(/<dimension ref="[^"]*"/, '<dimension ref="A1:F1517"');
    zip.file('xl/worksheets/sheet1.xml', tamperedXml);
    const tamperedBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const recoveredResult = await parseStatementFile(tamperedBuffer);
    expect(recoveredResult.origRef).toBe('A1:F1517');
    expect(recoveredResult.totalRows).toBe(1691);
    expect(recoveredResult.transactions).toHaveLength(1691);

    // Verify line 1518 (15/07/2026 VENDOLITE 40.00) is successfully read
    const vendoliteTx = recoveredResult.transactions.find(t => t.line === 1518);
    expect(vendoliteTx).toBeDefined();
    expect(vendoliteTx.date).toBe('2026-07-15');
    expect(vendoliteTx.amount).toBe(40);
    expect(vendoliteTx.description).toMatch(/VENDOLIT/i);

    // Verify final closing balance from the last transaction
    expect(recoveredResult.closingBalance).toBe(345.93);
    expect(recoveredResult.reconciled).toBe(true);
  });

  test('Condition 8: Reconciles against expectedRows and fails loudly if parsed rows != expected rows', async () => {
    // Correct expectedRows should succeed
    const okResult = await parseStatementFile(fixtureBuffer, null, [], { expectedRows: 1691 });
    expect(okResult.totalRows).toBe(1691);

    // Mismatched expectedRows should throw loudly with clear error message
    await expect(
      parseStatementFile(fixtureBuffer, null, [], { expectedRows: 1516 })
    ).rejects.toThrow(/Statement reconciliation failed: parsed 1691 transaction rows, but expected 1516 rows/);
  });
});
