const test = require('node:test');
const assert = require('node:assert');
const importRouter = require('../routes/import');
const parseDate = importRouter.parseDate;

test('parseDate tests under multiple timezones', () => {
  const testCases = [
    { input: '2024-08-15', expected: '2024-08-15' },
    { input: '2024-08-15T10:30:00.000Z', expected: '2024-08-15' },
    { input: '15 Aug 2024', expected: '2024-08-15' },
    { input: '15-Aug-2024', expected: '2024-08-15' },
    { input: '15 Sept 2024', expected: '2024-09-15' },
    { input: '15-September-2024', expected: '2024-09-15' },
    { input: '15/08/2024', expected: '2024-08-15' },
    { input: '15/08/2024 10:30', expected: '2024-08-15' },
    { input: '2024/08/15', expected: '2024-08-15' },
    { input: '31/02/2024', expected: null },
    { input: '15/13/2024', expected: null },
    { input: '31/04/2024', expected: null },
    { input: '45231', expected: '2023-11-01' },
    { input: new Date('2024-08-15T00:00:00.000Z'), expected: '2024-08-15' },
  ];

  const timezones = ['Asia/Kolkata', 'UTC'];

  for (const tz of timezones) {
    process.env.TZ = tz;
    for (const tc of testCases) {
      const actual = parseDate(tc.input);
      assert.strictEqual(
        actual,
        tc.expected,
        `Failed for input "${tc.input}" under TZ=${tz}. Expected ${tc.expected}, got ${actual}`
      );
    }
  }
});
