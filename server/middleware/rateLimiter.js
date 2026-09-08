const rateLimit = require('express-rate-limit');

const getUserOrIpKey = (req) => {
  return req.user?.id ? `user_${req.user.id}` : req.ip;
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each user/IP to 20 import requests per windowMs
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Too many import requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const transactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // generous limit for CRUD operations per user/IP
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 resend attempts per hour per IP/user
  keyGenerator: getUserOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Too many verification email requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, importLimiter, transactionLimiter, resendLimiter };
