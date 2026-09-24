const { getUserOrIpKey } = require('../middleware/rateLimiter');
require('dotenv').config();

describe('Rate Limiter Key & Row-Level Security (RLS) Tests', () => {
  describe('Rate Limiter Key Generator', () => {
    it('uses user_id when user is authenticated', () => {
      const req = { user: { id: 42 }, ip: '127.0.0.1' };
      expect(getUserOrIpKey(req)).toBe('user_42');
    });

    it('falls back to IP address when unauthenticated', () => {
      const req = { user: null, ip: '192.168.1.1' };
      expect(getUserOrIpKey(req)).toBe('192.168.1.1');
    });
  });

  describe('Row-Level Security (RLS) Isolation', () => {
    let pool;
    let dbAvailable = false;

    beforeAll(async () => {
      if (!process.env.DATABASE_URL) return;
      try {
        const { Pool } = require('pg');
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 3000,
        });
        await pool.query('SELECT 1');
        dbAvailable = true;
      } catch (err) {
        dbAvailable = false;
      }
    });

    afterAll(async () => {
      if (pool) {
        await pool.end().catch(() => {});
      }
    });

    it('returns zero rows when querying transactions without app.user_id set', async () => {
      if (!dbAvailable) {
        console.log('Skipping RLS integration test: Database is not accessible');
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Ensure testing under non-owner role app_user so RLS policy applies
        await client.query('SET LOCAL ROLE app_user');
        // Clear app.user_id
        await client.query("SELECT set_config('app.user_id', '', true)");

        const res = await client.query('SELECT * FROM transactions');
        expect(res.rows.length).toBe(0);

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });
});
