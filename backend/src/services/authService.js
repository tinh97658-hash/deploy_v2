// const bcrypt = require("bcrypt"); // Temporarily disabled for plain text password
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student"); // Using new structure

class AuthService {
  // Đăng nhập
  // CẢNH BÁO: Hiện tại đang sử dụng plain text password cho testing
  // CẦN IMPLEMENT bcrypt hash trước khi đưa vào production!
  static async login(username, password) {
    try {
      // Tìm user theo username hoặc email
      let user = await User.findByUsername(username);
      if (!user) {
        user = await User.findByEmail(username);
      }

      if (!user) {
        throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác");
      }

      console.log('Login attempt for username:', username);
      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('User data:', { id: user.id, username: user.username, role: user.role });
        console.log('Password from DB:', user.password_hash);
      }

      // Kiểm tra mật khẩu (Plain text comparison - temporary for testing)
      console.log('Testing password:', password);
      console.log('Stored password:', user.password_hash);
      
      const isPasswordValid = (password === user.password_hash);
      console.log('Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác");
      }

      // Lấy thông tin chi tiết cho sinh viên
      let userDetails = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      };

      if (user.role === 'STUDENT') {
        const studentInfo = await Student.findByUserId(user.id);
        if (studentInfo) {
          userDetails.student_id = studentInfo.id;
          userDetails.student_code = studentInfo.student_code;
          userDetails.department_id = studentInfo.department_id;
          userDetails.department_name = studentInfo.department_name;
          userDetails.major_id = studentInfo.major_id;
          userDetails.major_name = studentInfo.major_name;
        }
      }
      
      if (!isPasswordValid) {
        throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác");
      }

      // Bỏ qua cập nhật last_login vì bảng không có cột này
      // await User.updateLastLogin(user.id);

      // Tạo JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET || "default_secret_key",
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // Refresh token (tuỳ chọn)
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || "refresh_secret_key",
        { expiresIn: "7d" }
      );

      return {
        success: true,
        message: "Đăng nhập thành công",
        data: {
          token,
          refreshToken,
          user: userDetails
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || "refresh_secret_key"
      );
      
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error("User không tồn tại");
      }

      const newToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          role: user.role 
        },
        process.env.JWT_SECRET || "default_secret_key",
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      return {
        success: true,
        message: "Refresh token thành công",
        data: {
          token: newToken
        }
      };
    } catch (error) {
      throw new Error("Refresh token không hợp lệ");
    }
  }

  // Verify token
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || "default_secret_key"
      );
      
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error("User không tồn tại");
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role
          }
        }
      };
    } catch (error) {
      throw new Error("Token không hợp lệ");
    }
  }
}

module.exports = AuthService;
