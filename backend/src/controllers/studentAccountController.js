const bcrypt = require('bcrypt');
const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');
const User = require('../models/User');

class StudentAccountController {
  // Lấy hồ sơ sinh viên đang đăng nhập
  static async getMyProfile(req, res) {
    try {
      const userId = req.user.id;
      const query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.full_name,
          u.email,
          u.role,
          s.student_code,
          s.phone_number,
          c.id as class_id,
          c.name as class_name,
          m.id as major_id,
          m.name as major_name,
          d.id as department_id,
          d.name as department_name
        FROM Users u
          LEFT JOIN Students s ON s.user_id = u.id
          LEFT JOIN Classes c ON s.class_id = c.id
          LEFT JOIN Majors m ON c.major_id = m.id
          LEFT JOIN Departments d ON m.department_id = d.id
        WHERE u.id = ?
        LIMIT 1`;
      const rows = await DatabaseService.execute(query, [userId]);
      if (!rows || rows.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy người dùng', 404);
      }
      return ResponseHelper.success(res, rows[0], 'Lấy hồ sơ thành công');
    } catch (err) {
      console.error('getMyProfile error:', err);
      return ResponseHelper.error(res, 'Lỗi server khi lấy hồ sơ', 500);
    }
  }

  // Đổi mật khẩu
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return ResponseHelper.error(res, 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới', 400);
      }

      const user = await User.findById(userId);
      if (!user) return ResponseHelper.error(res, 'User không tồn tại', 404);

      // Kiểm tra currentPassword (ưu tiên password_hash)
      let valid = false;
      if (user.password_hash) {
        try { valid = await bcrypt.compare(currentPassword, user.password_hash); } catch (_) { valid = false; }
      }
      if (!valid) {
        // Fallback plain text so tương thích DB cũ
        valid = currentPassword === user.password;
      }
      if (!valid) return ResponseHelper.error(res, 'Mật khẩu hiện tại không đúng', 400);

      // Cập nhật
      const ok = await User.updatePassword(userId, newPassword);
      if (!ok) return ResponseHelper.error(res, 'Không thể cập nhật mật khẩu', 500);
      return ResponseHelper.success(res, { updated: true }, 'Đổi mật khẩu thành công');
    } catch (err) {
      console.error('changePassword error:', err);
      return ResponseHelper.error(res, 'Lỗi server khi đổi mật khẩu', 500);
    }
  }
}

module.exports = StudentAccountController;
