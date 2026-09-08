const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ExpTracker REST API Documentation',
      version: '1.1.0',
      description:
        'Official REST API documentation for ExpTracker expense management and statement parsing application.',
      contact: {
        name: 'ExpTracker Support',
        url: 'https://github.com/Pranava19/exptracker',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      {
        url: 'https://exptracker.vercel.app',
        description: 'Production Vercel Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT authorization token stored in httpOnly cookie',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 101 },
            user_id: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
            category: { type: 'string', example: 'Food & Dining' },
            amount: { type: 'number', format: 'float', example: 450.50 },
            description: { type: 'string', example: 'UPI/DR/12345/Swiggy/' },
            payee: { type: 'string', example: 'Swiggy' },
            date: { type: 'string', format: 'date', example: '2026-08-15' },
            mode: { type: 'string', example: 'UPI' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'An error occurred processing request' },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          summary: 'Health Check Endpoint',
          tags: ['Health'],
          responses: {
            200: { description: 'Database and server are healthy' },
            503: { description: 'Database connectivity error' },
          },
        },
      },
      '/api/auth/register': {
        post: {
          summary: 'Register a new user account',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Jane Doe' },
                    email: { type: 'string', example: 'jane@example.com' },
                    password: { type: 'string', example: 'securepassword123' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered successfully' },
            400: { description: 'Validation error or email already registered' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Authenticate user and set JWT cookies',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'jane@example.com' },
                    password: { type: 'string', example: 'securepassword123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'User logged in successfully' },
            400: { description: 'Invalid credentials' },
            403: { description: 'Email unverified' },
          },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          summary: 'Request password reset email with SHA-256 token',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', example: 'jane@example.com' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset email sent if account exists' },
          },
        },
      },
      '/api/auth/reset-password': {
        post: {
          summary: 'Reset password using raw token from email',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: {
                    token: { type: 'string', example: 'raw_token_hex_from_email' },
                    password: { type: 'string', example: 'newpassword123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset successfully' },
            400: { description: 'Invalid or expired token' },
          },
        },
      },
      '/api/transactions': {
        get: {
          summary: 'Get user transactions with optional filtering and pagination',
          tags: ['Transactions'],
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', example: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', example: 0 } },
            { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          ],
          responses: {
            200: { description: 'List of transactions or paginated transaction object' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Create a new transaction',
          tags: ['Transactions'],
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Transaction' },
              },
            },
          },
          responses: {
            201: { description: 'Transaction created successfully' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/api/transactions/duplicates': {
        delete: {
          summary: 'Clean up duplicate transactions for authenticated user',
          tags: ['Transactions'],
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'Number of deleted duplicate records returned' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './index.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
