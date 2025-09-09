const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student'); // Using new structure
const ResponseHelper = require('../utils/ResponseHelper');

class AuthController {
  // Đăng nhập
  static async login(req, res) {
    try {
      console.log('=== LOGIN REQUEST ===');
      console.log('Body:', req.body);
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        console.log('Missing username or password');
        return ResponseHelper.error(res, 'Username và password là bắt buộc', 400);
      }

      console.log('Looking for user:', username);
      // Tìm user trong database
      const user = await User.findByUsername(username);
      console.log('Found user:', user ? 'Yes' : 'No');
      if (!user) {
        return ResponseHelper.error(res, 'Tên đăng nhập hoặc mật khẩu không đúng', 401);
      }

      console.log('Comparing password...');
      // Hỗ trợ cả hai trường (password_hash chuẩn và legacy password)
      let isPasswordValid = false;
      if (user.password_hash) {
        try {
          isPasswordValid = await bcrypt.compare(password, user.password_hash);
        } catch (e) {
          isPasswordValid = false;
        }
      }
      if (!isPasswordValid) {
        // Fallback to legacy plain comparison
        isPasswordValid = password === user.password;
      }
      console.log('Password valid:', isPasswordValid);
      if (!isPasswordValid) {
        return ResponseHelper.error(res, 'Tên đăng nhập hoặc mật khẩu không đúng', 401);
      }

      // Kiểm tra trạng thái tài khoản (bỏ qua vì bảng Users không có cột status)
      // if (user.status === 'inactive') {
      //   return ResponseHelper.error(res, 'Tài khoản đã bị vô hiệu hóa', 403);
      // }

      // Tạo JWT token
      console.log('Creating token with user info:', {
        id: user.id,
        username: user.username,
        role: user.role,
        type: user.role.toLowerCase()
      });
      
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          type: user.role.toLowerCase() // Chuyển về lowercase để frontend dễ xử lý (STUDENT -> student, ADMIN -> admin)
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Tạo refresh token
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      // Cập nhật last login
      await User.updateLastLogin(user.id);

      // Lấy thông tin student nếu là role STUDENT
      let studentInfo = null;
      if (user.role === 'STUDENT') {
        try {
          studentInfo = await Student.findByUserId(user.id);
        } catch (error) {
          console.log('No student info found for user:', user.id);
        }
      }

      // Trả về thông tin user (không bao gồm password)
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        type: user.role.toLowerCase(), // Để frontend dễ xử lý
        ...(studentInfo && { 
          studentId: studentInfo.student_code || studentInfo.student_id,
          major: studentInfo.major_name || studentInfo.major,
          year: studentInfo.year,
          class: studentInfo.class_name || studentInfo.class,
          department: studentInfo.department_name
        })
      };

      // Set cookies (httpOnly)
      const isProd = process.env.NODE_ENV === 'production';
      // Dùng Lax trong dev (proxy) và None+Secure ở production HTTPS
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
      };
      res.cookie('access_token', token, cookieOptions);
      res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return ResponseHelper.success(res, {
        message: 'Đăng nhập thành công',
        // Still return for backward compatibility (frontend sẽ bỏ dần)
        token,
        refreshToken,
        user: userResponse
      });

    } catch (error) {
      console.error('Login error:', error);
      return ResponseHelper.error(res, 'Lỗi server', 500);
    }
  }

  // Đăng xuất
  static async logout(req, res) {
    try {
      // Trong thực tế, bạn có thể lưu token vào blacklist
      // Ở đây chỉ trả về success
  // Clear cookies
  const isProd = process.env.NODE_ENV === 'production';
  const clearOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' };
  res.clearCookie('access_token', clearOpts);
  res.clearCookie('refresh_token', clearOpts);
  return ResponseHelper.success(res, { message: 'Đăng xuất thành công' });
    } catch (error) {
      console.error('Logout error:', error);
      return ResponseHelper.error(res, 'Lỗi server', 500);
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      // Try body then cookie
      let { refreshToken } = req.body;
      if (!refreshToken && req.cookies && req.cookies['refresh_token']) {
        refreshToken = req.cookies['refresh_token'];
      }
      if (!refreshToken) {
        return ResponseHelper.error(res, 'Refresh token là bắt buộc', 400);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
      
      // Tìm user
      const user = await User.findById(decoded.id);
      if (!user) {
        return ResponseHelper.error(res, 'User không tồn tại', 401);
      }

      // Tạo token mới
      const newToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          type: user.role.toLowerCase()
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Update access token cookie
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('access_token', newToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
      });
      return ResponseHelper.success(res, { token: newToken });

    } catch (error) {
      console.error('Refresh token error:', error);
      return ResponseHelper.error(res, 'Token không hợp lệ', 401);
    }
  }

  // Kiểm tra token
  static async verifyToken(req, res) {
    try {
      // Token đã được verify ở middleware
      const user = await User.findById(req.user.id);
      if (!user) {
        return ResponseHelper.error(res, 'User không tồn tại', 401);
      }

      // Lấy thông tin student nếu là role STUDENT
      let studentInfo = null;
      if (user.role === 'STUDENT') {
        try {
          studentInfo = await Student.findByUserId(user.id);
        } catch (error) {
          console.log('No student info found for user:', user.id);
        }
      }

      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        type: user.role.toLowerCase(),
        ...(studentInfo && { 
          studentId: studentInfo.student_code || studentInfo.student_id,
          major: studentInfo.major_name || studentInfo.major,
          year: studentInfo.year,
          class: studentInfo.class_name || studentInfo.class,
          department: studentInfo.department_name
        })
      };

      return ResponseHelper.success(res, {
        user: userResponse
      });

    } catch (error) {
      console.error('Verify token error:', error);
      return ResponseHelper.error(res, 'Lỗi server', 500);
    }
  }
}

module.exports = AuthController;
