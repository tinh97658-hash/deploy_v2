// Simple async middleware wrapper to eliminate repetitive try/catch in controllers
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
