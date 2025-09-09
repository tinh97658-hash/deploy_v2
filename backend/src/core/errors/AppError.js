class AppError extends Error {
  constructor(message, statusCode = 400, meta = null) {
    super(message);
    this.statusCode = statusCode;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
