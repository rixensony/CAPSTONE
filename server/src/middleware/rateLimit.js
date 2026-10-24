import rateLimit from 'express-rate-limit';

const standard = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export const apiLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
});

/**
 * Tighter limit on login/registration (guide §10: rate limit sensitive
 * endpoints). Disabled while NODE_ENV=test so the API suite can run freely.
 */
export const authLimiter = rateLimit({
  ...standard,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});
