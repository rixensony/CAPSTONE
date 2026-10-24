/**
 * Wraps async route handlers so rejected promises are forwarded to the
 * central error handler instead of crashing the process (guide §6.3).
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
