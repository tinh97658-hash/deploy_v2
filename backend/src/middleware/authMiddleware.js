const jwt = require('jsonwebtoken');
const ResponseHelper = require('../utils/ResponseHelper');

// Middleware để xác thực token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  // Fallback: read from httpOnly cookie
  if (!token && req.cookies && req.cookies['access_token']) {
    token = req.cookies['access_token'];
  }

  if (!token) {
    return ResponseHelper.error(res, 'Access token không được cung cấp', 401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return ResponseHelper.error(res, 'Token không hợp lệ hoặc đã hết hạn', 403);
    }

    req.user = user;
    next();
  });
};

// Middleware để kiểm tra role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('requireRole: No user in request');
      return ResponseHelper.error(res, 'Người dùng chưa được xác thực', 401);
    }

    console.log(`requireRole: Checking if user role '${req.user.role}' is in allowed roles:`, roles);
    
    if (!roles.includes(req.user.role)) {
      console.error(`requireRole: Access denied. User role '${req.user.role}' not in allowed roles:`, roles);
      return ResponseHelper.error(res, 'Không có quyền truy cập', 403);
    }

    console.log(`requireRole: Access granted for role '${req.user.role}'`);
    next();
  };
};

// Middleware để kiểm tra role admin
const requireAdmin = (req, res, next) => {
  return requireRole('ADMIN')(req, res, next);
};

// Middleware để kiểm tra role student
const requireStudent = (req, res, next) => {
  return requireRole('STUDENT')(req, res, next);
};

// Middleware cho phép cả admin và student
const requireAuth = (req, res, next) => {
  return requireRole('ADMIN', 'STUDENT')(req, res, next);
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireStudent,
  requireAuth
};
