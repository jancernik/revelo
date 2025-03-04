// src/utils/errors.js
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message, details = null) {
    super(message, 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message, details = null) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message, details = null) {
    super(message, 404, details);
  }
}

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: err.errors
    });
  }
  
  // Handle our custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      details: err.details
    });
  }
  
  // Handle other known error types
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
    });
  }
  
  // Default to 500 server error
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Something went wrong'
  });
};

// Async handler to avoid try-catch blocks everywhere
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};