import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Central error handler (guide §6.3): one consistent JSON shape, safe client
 * messages, technical details kept in server logs only.
 */
export function errorHandler(error, req, res, _next) {
  let statusCode = error instanceof ApiError ? error.statusCode : 500;
  let message = error instanceof ApiError ? error.message : 'Something went wrong on our side. Please try again.';
  let errors = error instanceof ApiError ? error.errors : undefined;

  // Mongoose schema validation -> 400 with per-field messages.
  if (error?.name === 'ValidationError' && error.errors) {
    statusCode = 400;
    message = 'Validation failed. Please correct the highlighted fields.';
    errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      msg: err.message,
    }));
  }

  // Bad ObjectId reaching a controller -> treat like invalid input.
  if (error?.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier in request.';
  }

  // Unique index violations (email, pending request pairs) -> 409.
  if (error?.name === 'MongoServerError' && error.code === 11000) {
    statusCode = 409;
    const key = Object.keys(error.keyValue ?? {})[0];
    message =
      key === 'email'
        ? 'An account with this email already exists.'
        : 'A conflicting entry already exists.';
  }

  if (statusCode >= 500) {
    // Full detail stays in server logs; clients never see stack traces.
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  res.status(statusCode).json({
    message,
    ...(errors ? { errors } : {}),
    ...(statusCode >= 500 && !env.isProd ? { detail: String(error?.message || error) } : {}),
  });
}

/** Routes that matched no handler: 404 in the same envelope. */
export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
}

/**
 * Safety net for async code that bypassed the async wrapper, so an unexpected
 * rejection can never take the process down (guide §6.3).
 */
export function createErrorGuards() {
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('[uncaughtException] shutting down', error);
    process.exit(1);
  });
}

// mongoose imported for side-effect completeness of the error mapping above.
void mongoose;
