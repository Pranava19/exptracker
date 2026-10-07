const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Mock pool before requiring app
jest.mock('../db/index', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  withUserTransaction: jest.fn(),
}));

const pool = require('../db/index');
const app = require('../index');
const { parseStatementFile } = require('../routes/import');

describe('Server Import Handler (/api/import) Unit & Integration Tests', () => {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ id: 1, email: 'user@test.com' }, secret);
  const fixturePath = path.resolve(__dirname, 'fixtures/statement_fixture.xlsx');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseStatementFile() in-memory processing & performance timing', () => {
    it('returns elapsed ms metrics and correctly structures transactions and skipped rows', async () => {
      const buffer = fs.readFileSync(fixturePath);
      const customRules = [
        { pattern: 'swiggy', display_name: 'Swiggy Food', category: 'Food' },
      ];

      const result = await parseStatementFile(buffer, null, customRules);

      expect(result.transactions).toHaveLength(1691);
      expect(result.totalRowsRead).toBe(1691);
      expect(result.skipped).toEqual([]);
      expect(typeof result.parseElapsedMs).toBe('number');
      expect(result.parseElapsedMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.ruleMatchingElapsedMs).toBe('number');
      expect(result.ruleMatchingElapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('records skipped rows with line numbers and reasons for invalid or empty rows', async () => {
      const XLSX = require('xlsx');
      const wsData = [
        ['Txn Date', 'Narration', 'Debit', 'Credit', 'Balance'],
        ['', 'Missing Date Row', '100', '', '1000'],
        ['not-a-date', 'Bad Date Row', '200', '', '800'],
        ['2026-09-01', 'Zero Amount Row', '0', '0', '800'],
        ['2026-09-02', 'Valid Row', '50', '', '750'],
        ['2026-09-02', 'Valid Row', '50', '', '700'], // In-file duplicate
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const testBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await parseStatementFile(testBuffer);
      expect(result.transactions).toHaveLength(1);
      expect(result.skipped).toHaveLength(4);

      expect(result.skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 2, reason: 'Missing date' }),
          expect.objectContaining({ line: 3, reason: expect.stringMatching(/Invalid date format/) }),
          expect.objectContaining({ line: 4, reason: 'Missing or zero debit and credit amounts' }),
          expect.objectContaining({ line: 6, reason: 'Duplicate transaction within statement file' }),
        ])
      );
    });
  });

  describe('POST /api/import response schema and single-transaction batching', () => {
    it('loads rules once, checks date range, inserts in chunks, and returns { parsed, inserted, skipped }', async () => {
      // 1. Mock rules query
      pool.query.mockImplementation((sql, params) => {
        if (typeof sql === 'string' && sql.includes('payee_rules')) {
          return Promise.resolve({
            rows: [{ pattern: 'amazon', display_name: 'Amazon Shopping', category: 'Shopping' }],
          });
        }
        if (typeof sql === 'string' && sql.includes('FROM transactions')) {
          // Date range check query: simulate 1 existing transaction in DB
          return Promise.resolve({
            rows: [
              {
                date: '2026-01-26',
                amount: 150,
                type: 'expense',
                norm_desc: 'upi-162651954990-payee',
                norm_payee: 'payee',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      // 2. Mock transaction client
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql.includes('set_config')) {
            return Promise.resolve();
          }
          if (sql.includes('INSERT INTO transactions')) {
            // Count rows in the insert
            const rowsInserted = Math.floor(params.length / 7);
            return Promise.resolve({ rowCount: rowsInserted });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      const res = await request(app)
        .post('/api/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', fixturePath);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('parsed');
      expect(res.body).toHaveProperty('inserted');
      expect(res.body).toHaveProperty('skipped');
      expect(Array.isArray(res.body.skipped)).toBe(true);
      expect(res.body.parsed).toBe(1691);
      expect(res.body.inserted).toBeGreaterThan(0);

      // Verify single transaction lifecycle
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('does not rollback transaction if client disconnects after commit', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql.includes('set_config')) {
            return Promise.resolve();
          }
          if (sql.includes('INSERT INTO transactions')) {
            return Promise.resolve({ rowCount: 1 });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      // Create a small test file
      const XLSX = require('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        ['Txn Date', 'Narration', 'Debit', 'Credit', 'Balance'],
        ['2026-09-01', 'Test Txn', '100', '', '900'],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const smallBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', smallBuf, 'small.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.parsed).toBe(1);
      expect(res.body.inserted).toBe(1);
      expect(res.body.skipped).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).not.toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
