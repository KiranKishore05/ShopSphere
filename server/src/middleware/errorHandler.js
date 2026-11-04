import { ZodError } from 'zod';
import config from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: []
    }
  });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred on the server';
  let details = err.details || [];

  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      issue: e.message
    }));
  }

  // 2. Handle Mongoose Schema Validation errors
  else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Data validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path || 'unknown',
      issue: e.message
    }));
  }

  // 3. Handle Mongoose CastError (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_RESOURCE_ID';
    message = `Invalid format for parameter '${err.path}'`;
    details = [{ field: err.path, issue: 'Expected a valid ObjectId' }];
  }

  // 4. Handle Mongoose duplicate key error (code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'RESOURCE_CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'unknown';
    message = `A resource with that ${field} already exists`;
    details = [{ field, issue: `Duplicate value '${err.keyValue ? err.keyValue[field] : ''}'` }];
  }

  // 5. Handle MongoDB Connection / Server Selection / Network / Timeout errors
  else if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongoNetworkTimeoutError' ||
    (err.name === 'MongooseError' && err.message && err.message.includes('buffering timed out'))
  ) {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'Database service is temporarily unavailable. Please retry shortly.';
    details = [{ field: 'database', issue: 'Connection to database server timed out or was refused' }];
  }

  // 6. Handle JWT authentication errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid authentication token signature';
    details = [];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired. Please log in again';
    details = [];
  } else if (err.name === 'NotBeforeError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication token is not yet active';
    details = [];
  }

  // Sanitize internal server error messages in production
  if (config.NODE_ENV === 'production' && statusCode === 500 && !err.isOperational) {
    message = 'An unexpected internal error occurred on the server';
    details = [];
  }

  const responsePayload = {
    success: false,
    error: {
      code,
      message,
      details
    }
  };

  // Only expose stack trace in development for 500 errors
  if (config.NODE_ENV === 'development' && statusCode === 500) {
    responsePayload.error.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

export default errorHandler;
