const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock pool before importing app
jest.mock('../db/index', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  withUserTransaction: jest.fn(async (userId, cb) => {
    const mockClient = {
      query: jest.fn(),
    };
    return cb(mockClient);
  }),
}));

const pool = require('../db/index');
const app = require('../index');

describe('Database Unique Dedup Constraint & Import Tests', () => {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ id: 1, email: 'test@example.com' }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Transaction Creation (POST /transactions)', () => {
    it('returns 201 when inserting a new unique transaction', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 10, amount: 250, description: 'Lunch', payee: 'Swiggy', type: 'expense' }],
          }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 250,
          type: 'expense',
          category: 'Food',
          date: '2026-09-25T00:00:00.000Z',
          description: 'Lunch',
          payee: 'Swiggy',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBe(10);
    });

    it('returns 409 Conflict when unique constraint (23505) is violated', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn().mockRejectedValueOnce({
            code: '23505',
            constraint: 'idx_transactions_dedup_hash',
            message: 'duplicate key value violates unique constraint "idx_transactions_dedup_hash"',
          }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 250,
          type: 'expense',
          category: 'Food',
          date: '2026-09-25T00:00:00.000Z',
          description: 'Lunch',
          payee: 'Swiggy',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/duplicate transaction/i);
    });
  });

  describe('Bulk Import Transaction Handling (POST /transactions/import)', () => {
    it('gracefully skips transactions that violate unique constraint without failing the transaction', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}) // set_config
          .mockResolvedValueOnce({}) // SAVEPOINT tx_sp_0
          .mockResolvedValueOnce({ rows: [{ id: 101, amount: 500, description: 'Groceries' }] }) // INSERT 1 succeeds
          .mockResolvedValueOnce({}) // RELEASE SAVEPOINT tx_sp_0
          .mockResolvedValueOnce({}) // SAVEPOINT tx_sp_1
          .mockRejectedValueOnce({ // INSERT 2 throws 23505 duplicate key
            code: '23505',
            constraint: 'idx_transactions_dedup_hash',
            message: 'duplicate key value violates unique constraint "idx_transactions_dedup_hash"',
          })
          .mockResolvedValueOnce({}) // ROLLBACK TO SAVEPOINT tx_sp_1
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      const res = await request(app)
        .post('/transactions/import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactions: [
            { amount: 500, type: 'expense', category: 'Shopping', date: '2026-09-25', description: 'Groceries' },
            { amount: 500, type: 'expense', category: 'Shopping', date: '2026-09-25', description: 'Groceries' },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.count).toBe(1);
      expect(res.body.skipped).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
