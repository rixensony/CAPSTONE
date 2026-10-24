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
 * Window and limit are env-tunable so demo/manual-testing sessions can be
 * relaxed without touching code.
 */
export const authLimiter = rateLimit({
  ...standard,
  windowMs: Number(process.env.AUTH_RATE_WINDOW_MINUTES ?? 15) * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_MAX ?? 50),
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});
