/**
 * Error thrown by controllers that already know the right HTTP status.
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const badRequest = (message, errors) => new ApiError(400, message, errors);
export const unauthorized = (message = 'Authentication required.') => new ApiError(401, message);
export const forbidden = (message = 'You are not allowed to perform this action.') => new ApiError(403, message);
export const notFound = (message = 'Resource not found.') => new ApiError(404, message);
export const conflict = (message) => new ApiError(409, message);
