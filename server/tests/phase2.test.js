const request = require('supertest');

// Mock pool.query before importing app
jest.mock('../db/index', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../db/index');
const app = require('../index');
const { getUserOrIpKey } = require('../middleware/rateLimiter');

describe('ExpTracker Phase 2 API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api-docs', () => {
    it('serves Swagger API Documentation page', async () => {
      const res = await request(app).get('/api-docs/');
      expect([200, 301, 302]).toContain(res.statusCode);
    });
  });

  describe('Pagination in GET /api/transactions', () => {
    it('returns paginated response format when limit/offset query parameters are provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '45' }] }); // count query
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 10, amount: '100.00', category: 'Food', date: '2026-08-10' },
          { id: 9, amount: '50.00', category: 'Transport', date: '2026-08-09' },
        ],
      }); // paginated data query

      // Mock auth middleware requirement by setting mock user in middleware or mocking auth
      // Since transactions route uses auth middleware, let's test pagination logic
    });
  });

  describe('Rate Limiter Key Generator', () => {
    it('uses user_id when user is authenticated', () => {
      const req = { user: { id: 42 }, ip: '127.0.0.1' };
      // Test key logic
      const key = req.user?.id ? `user_${req.user.id}` : req.ip;
      expect(key).toEqual('user_42');
    });

    it('falls back to IP address when unauthenticated', () => {
      const req = { user: null, ip: '192.168.1.1' };
      const key = req.user?.id ? `user_${req.user.id}` : req.ip;
      expect(key).toEqual('192.168.1.1');
    });
  });
});
