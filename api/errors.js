export class AppError extends Error {
  constructor(message, { data = null, isOperational = true, statusCode = 500 } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileProcessingError extends AppError {
  constructor(message = "File processing failed", options = {}) {
    super(message, { statusCode: 422, ...options });
    this.name = "FileProcessingError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options = {}) {
    super(message, { statusCode: 403, ...options });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", options = {}) {
    super(message, { statusCode: 404, ...options });
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", options = {}) {
    super(message, { statusCode: 401, ...options });
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", options = {}) {
    super(message, { statusCode: 400, ...options });
    this.name = "ValidationError";
  }
}
