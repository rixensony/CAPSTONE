import { validationResult } from 'express-validator';

/**
 * Runs after validator chains: turns any failures into the consistent
 * 400 envelope { message, errors:[{field,msg}] } defined in the API contract.
 */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result
    .array()
    .filter((error) => Boolean(error.path) || Boolean(error.param))
    .map((error) => ({ field: error.path ?? error.param, msg: error.msg }));

  return res.status(400).json({
    message: errors.length > 0 ? 'Validation failed. Please correct the highlighted fields.' : 'Invalid request.',
    errors,
  });
}
