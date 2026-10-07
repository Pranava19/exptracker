const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock pool before importing app
jest.mock('../db/index', () => ({
  query: jest.fn(),
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

describe('Backup and Restore API Tests', () => {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ id: 1, email: 'test@example.com' }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Backup & Restore Endpoints', () => {
    it('GET /api/profile/backup exports transactions dataset', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [
                { type: 'expense', category: 'Food', amount: '250.00', description: 'Lunch', payee: 'Swiggy', date: '2026-09-25' },
              ],
            }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .get('/api/profile/backup')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.version).toBe(1);
      expect(res.body.transactions.length).toBe(1);
      expect(res.body.transactions[0].payee).toBe('Swiggy');
    });

    it('POST /api/profile/restore imports dataset successfully', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // check existing transaction
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }), // insert transaction
        };
        return cb(mockClient);
      });

      const backupData = {
        version: 1,
        transactions: [
          { type: 'expense', category: 'Food', amount: 300, date: '2026-09-25', description: 'Dinner', payee: 'Restaurant' },
        ],
      };

      const res = await request(app)
        .post('/api/profile/restore')
        .set('Authorization', `Bearer ${token}`)
        .send(backupData);

      expect(res.statusCode).toBe(200);
      expect(res.body.restoredTransactions).toBe(1);
    });
  });
});
