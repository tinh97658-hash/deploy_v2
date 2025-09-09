const ResponseHelper = require('../../utils/ResponseHelper');
const AppError = require('./AppError');

// Central error handling middleware
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return ResponseHelper.error(res, err.message, err.statusCode, err.meta || null);
  }

  console.error('Unhandled Error:', err);
  return ResponseHelper.error(
    res,
    'Lỗi không xác định',
    500,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};
