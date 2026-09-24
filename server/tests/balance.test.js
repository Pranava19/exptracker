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

describe('Manual Current Balance Adjustment Tests', () => {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ id: 1, email: 'test@example.com' }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/profile/balance', () => {
    it('rejects missing or non-numeric balance input with 400', async () => {
      const res = await request(app)
        .put('/api/profile/balance')
        .set('Authorization', `Bearer ${token}`)
        .send({ balance: 'abc' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/valid numeric balance/i);
    });

    it('rejects invalid date format with 400', async () => {
      const res = await request(app)
        .put('/api/profile/balance')
        .set('Authorization', `Bearer ${token}`)
        .send({ balance: 25000, date: 'invalid-date-string' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid date/i);
    });

    it('successfully updates starting balance and returns 200', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, starting_balance: '25000.00', starting_balance_date: new Date('2026-09-25T00:00:00Z') },
        ],
      });

      const res = await request(app)
        .put('/api/profile/balance')
        .set('Authorization', `Bearer ${token}`)
        .send({ balance: 25000, date: '2026-09-25' });

      expect(res.statusCode).toBe(200);
      expect(res.body.starting_balance).toBe(25000);
      expect(res.body.message).toMatch(/updated successfully/i);
    });
  });

  describe('GET /api/profile/balance', () => {
    it('returns current user baseline settings', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, starting_balance: '15000.50', starting_balance_date: '2026-09-20T00:00:00.000Z' },
        ],
      });

      const res = await request(app)
        .get('/api/profile/balance')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.starting_balance).toBe(15000.5);
      expect(res.body.starting_balance_date).toBe('2026-09-20T00:00:00.000Z');
    });
  });

  describe('GET /api/transactions/summary calculation', () => {
    it('calculates Available Balance = starting_balance + SUM(date >= starting_balance_date) when baseline is set', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ starting_balance: '20000.00', starting_balance_date: '2026-09-20T00:00:00.000Z' }],
            })
            .mockResolvedValueOnce({
              rows: [{ total_income: '50000.00', total_expense: '30000.00', all_time_balance: '20000.00' }],
            })
            .mockResolvedValueOnce({
              rows: [{ net_since_baseline: '5000.00' }],
            }),
        };
        return cb(client);
      });

      const res = await request(app)
        .get('/api/transactions/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.starting_balance).toBe(20000);
      expect(res.body.balance).toBe(25000); // 20000 + 5000
    });

    it('falls back to all-time balance when starting_balance is not set', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ starting_balance: null, starting_balance_date: null }],
            })
            .mockResolvedValueOnce({
              rows: [{ total_income: '50000.00', total_expense: '30000.00', all_time_balance: '20000.00' }],
            }),
        };
        return cb(client);
      });

      const res = await request(app)
        .get('/api/transactions/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.starting_balance).toBeNull();
      expect(res.body.balance).toBe(20000);
    });
  });
});
