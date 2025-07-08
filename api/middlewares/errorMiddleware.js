import { NotFoundError } from "../errors.js";

export const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && !error.isOperational
      ? "Something went wrong"
      : error.message || "Internal server error";

  if (statusCode >= 500) {
    console.error("Server Error:", {
      message: error.message,
      method: req.method,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: req.originalUrl
    });
  }

  const response = {
    error: {
      message,
      statusCode
    },
    success: false
  };

  if (error.data) response.error.data = error.data;

  if (process.env.NODE_ENV !== "production") {
    response.error.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req, _res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};
