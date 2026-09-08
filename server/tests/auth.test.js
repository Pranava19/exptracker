const request = require('supertest');
const crypto = require('crypto');

// Mock pool.query before importing app
jest.mock('../db/index', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

// Mock sendEmail utility
jest.mock('../utils/sendEmail', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'mock_msg_123' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'mock_msg_456' }),
}));

const pool = require('../db/index');
const app = require('../index');

describe('ExpTracker Authentication & Health API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns 200 OK when database is connected', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const res = await request(app).get('/api/health');

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
      expect(res.body.database).toEqual('connected');
    });

    it('returns 503 Service Unavailable when database query fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('Connection terminated'));

      const res = await request(app).get('/api/health');

      expect(res.statusCode).toEqual(503);
      expect(res.body.status).toEqual('error');
      expect(res.body.database).toEqual('disconnected');
    });
  });

  describe('POST /api/auth/register (express-validator)', () => {
    it('returns 400 Bad Request when email or password is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'invalid-email', password: '123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('registers user successfully with valid inputs', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // existing check
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
      }); // insert

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'securepassword123' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toContain('Registration successful');
    });
  });

  describe('POST /api/auth/forgot-password & /api/auth/reset-password', () => {
    it('hashes token before saving to database in forgot-password', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 10, email: 'user@example.com' }],
      });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(pool.query).toHaveBeenCalledTimes(2);

      const updateCallArgs = pool.query.mock.calls[1];
      const storedHashedToken = updateCallArgs[1][0];

      // Check SHA-256 string length (64 hex characters)
      expect(storedHashedToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('hashes incoming token to match stored hash in reset-password', async () => {
      const rawToken = 'sample_raw_reset_token_string_123';
      const expectedHashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 10, email: 'user@example.com' }],
      }); // token query
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // password update query

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newsecretpassword123' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      const selectCallArgs = pool.query.mock.calls[0];
      expect(selectCallArgs[1][0]).toEqual(expectedHashedToken);
    });
  });
});
