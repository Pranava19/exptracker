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

describe('Subscriptions and Backup/Restore API Tests', () => {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ id: 1, email: 'test@example.com' }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Subscriptions Endpoints', () => {
    it('GET /api/subscriptions fetches user subscriptions', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [
              { id: 1, name: 'Netflix', amount: '649.00', frequency: 'monthly', due_date: 5 },
            ],
          }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe('Netflix');
    });

    it('POST /api/subscriptions rejects invalid subscription payload', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '', amount: -10 });

      expect(res.statusCode).toBe(400);
    });

    it('POST /api/subscriptions creates a new subscription', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [
              {
                id: 1,
                user_id: 1,
                name: 'Spotify',
                amount: '119.00',
                frequency: 'monthly',
                due_date: 15,
                category: 'Entertainment',
                payment_mode: 'UPI',
                status: 'active',
              },
            ],
          }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Spotify',
          amount: 119,
          frequency: 'monthly',
          due_date: 15,
          category: 'Entertainment',
          payment_mode: 'UPI',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Spotify');
    });

    it('POST /api/subscriptions/:id/log-payment records payment as transaction', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [
                {
                  id: 1,
                  user_id: 1,
                  name: 'Broadband',
                  amount: '999.00',
                  category: 'Bills & Utilities',
                  payment_mode: 'UPI',
                },
              ],
            })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: 101,
                  user_id: 1,
                  type: 'expense',
                  category: 'Bills & Utilities',
                  amount: '999.00',
                  description: 'Subscription: Broadband',
                  payee: 'Broadband',
                },
              ],
            }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .post('/api/subscriptions/1/log-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(201);
      expect(res.body.transaction.amount).toBe('999.00');
    });

    it('DELETE /api/subscriptions/:id removes the subscription', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 1 }],
          }),
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .delete('/api/subscriptions/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  describe('Backup & Restore Endpoints', () => {
    it('GET /api/profile/backup exports complete dataset', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ starting_balance: '15000.00', starting_balance_date: new Date() }],
            })
            .mockResolvedValueOnce({
              rows: [
                { type: 'expense', category: 'Food', amount: '250.00', description: 'Lunch', payee: 'Swiggy', date: '2026-09-25' },
              ],
            })
            .mockResolvedValueOnce({
              rows: [
                { name: 'Netflix', amount: '649.00', frequency: 'monthly', due_date: 5 },
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
      expect(res.body.profile.starting_balance).toBe(15000);
      expect(res.body.transactions.length).toBe(1);
      expect(res.body.subscriptions.length).toBe(1);
    });

    it('POST /api/profile/restore imports dataset successfully', async () => {
      pool.withUserTransaction.mockImplementationOnce(async (userId, cb) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({}) // UPDATE users starting_balance
            .mockResolvedValueOnce({ rows: [] }) // check existing transaction
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // insert transaction
            .mockResolvedValueOnce({ rows: [] }) // check existing subscription
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }), // insert subscription
        };
        return cb(mockClient);
      });

      const backupData = {
        version: 1,
        profile: { starting_balance: 10000, starting_balance_date: '2026-09-01' },
        transactions: [
          { type: 'expense', category: 'Food', amount: 300, date: '2026-09-25', description: 'Dinner' },
        ],
        subscriptions: [
          { name: 'Spotify', amount: 119, frequency: 'monthly', due_date: 10 },
        ],
      };

      const res = await request(app)
        .post('/api/profile/restore')
        .set('Authorization', `Bearer ${token}`)
        .send(backupData);

      expect(res.statusCode).toBe(200);
      expect(res.body.restoredTransactions).toBe(1);
      expect(res.body.restoredSubscriptions).toBe(1);
      expect(res.body.balanceUpdated).toBe(true);
    });
  });
});
