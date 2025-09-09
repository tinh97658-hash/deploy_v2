const ResponseHelper = require('../utils/ResponseHelper');
const User = require('../models/User');
const CacheService = require('../services/CacheService');
const EmailService = require('../services/EmailService');
const crypto = require('crypto');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOTP(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += digits[Math.floor(Math.random() * 10)];
  return code;
}

function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

class PasswordResetController {
  static async requestReset(req, res) {
    try {
      const { username, email } = req.body;
      if (!username) return ResponseHelper.error(res, 'Tài khoản là bắt buộc', 400);
      if (!email) return ResponseHelper.error(res, 'Email là bắt buộc', 400);
      if (!isValidEmail(email)) return ResponseHelper.error(res, 'Email không hợp lệ', 400);

      // Basic rate limit per email and per IP
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
      const ipKey = `ip:${ip}`;
      const emailCount = await CacheService.incrResetRequestCounter(email);
      const userKey = `user:${username}`;
      const userCount = await CacheService.incrResetRequestCounter(userKey);
      const ipCount = await CacheService.incrResetRequestCounter(ipKey);
      const maxReq = parseInt(process.env.RESET_REQ_MAX || '5', 10);
      if (emailCount > maxReq || userCount > maxReq || ipCount > maxReq * 2) {
        return ResponseHelper.error(res, 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.', 429);
      }

      const user = await User.findByUsername(username);
      if (!user) return ResponseHelper.error(res, 'Không tìm thấy người dùng với tài khoản này', 404);
      const normalizedDbEmail = (user.email || '').trim().toLowerCase();
      const normalizedReqEmail = (email || '').trim().toLowerCase();
      if (!normalizedDbEmail || normalizedDbEmail !== normalizedReqEmail) {
        return ResponseHelper.error(res, 'Email không khớp với tài khoản. Vui lòng kiểm tra lại.', 400);
      }

      // Generate OTP and store in Redis
      const otp = generateOTP();
      const ok = await CacheService.setResetOTP(email, otp, parseInt(process.env.RESET_OTP_TTL || '600', 10));
      if (!ok) return ResponseHelper.error(res, 'Không thể tạo mã OTP. Vui lòng thử lại sau.', 500);

      // Send email
  const subject = 'Mã xác minh đặt lại mật khẩu (VMU Quiz)';
      const html = `
        <p>Xin chào ${user.full_name || user.username},</p>
        <p>Mã xác minh (OTP) của bạn là: <b>${otp}</b></p>
        <p>Mã có hiệu lực trong 10 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
      `;
  const result = await EmailService.sendMail({ to: email, subject, html, text: `OTP: ${otp}` });
  if (!result.success) return ResponseHelper.error(res, 'Không thể gửi email OTP: ' + result.error, 500);

  return ResponseHelper.success(res, { message: 'Đã gửi mã xác minh đến email' });
    } catch (err) {
      console.error('requestReset error:', err);
      return ResponseHelper.error(res, 'Lỗi server', 500);
    }
  }

  // Verify OTP only (no password change). Useful for gating UI before allowing new password entry.
  static async verifyOTPOnly(req, res) {
    try {
      const { username, email, otp } = req.body;
      if (!email || !otp) return ResponseHelper.error(res, 'Email và OTP là bắt buộc', 400);
      if (!isValidEmail(email)) return ResponseHelper.error(res, 'Email không hợp lệ', 400);

      // Attempt rate limit
      const attempts = await CacheService.incrOTPVerifyAttempts(email);
      const maxAttempts = parseInt(process.env.RESET_OTP_MAX_ATTEMPTS || '8', 10);
      if (attempts > maxAttempts) {
        return ResponseHelper.error(res, 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.', 429);
      }

      // Chỉ kiểm tra OTP với email - không cần check username-email consistency ở bước này
      // vì OTP đã được gửi tới email cụ thể và đó là đủ để xác thực
      const stored = await CacheService.getResetOTP(email);
      if (!stored || stored.toString() !== otp.toString()) {
        return ResponseHelper.error(res, 'Mã OTP không hợp lệ hoặc đã hết hạn', 400);
      }

      // Do not invalidate here; user still needs it for the actual reset call
      return ResponseHelper.success(res, { message: 'OTP hợp lệ' });
    } catch (err) {
      console.error('verifyOTPOnly error:', err);
      return ResponseHelper.error(res, 'Lỗi server', 500);
    }
  }

  static async verifyAndReset(req, res) {
    try {
  let { username, email, otp, mode } = req.body; // mode: 'temp' | 'new'
      if (!email || !otp) return ResponseHelper.error(res, 'Email và OTP là bắt buộc', 400);
      if (!isValidEmail(email)) return ResponseHelper.error(res, 'Email không hợp lệ', 400);

      // Attempt rate limit
      const attempts = await CacheService.incrOTPVerifyAttempts(email);
      const maxAttempts = parseInt(process.env.RESET_OTP_MAX_ATTEMPTS || '8', 10);
      if (attempts > maxAttempts) {
        return ResponseHelper.error(res, 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.', 429);
      }

      const stored = await CacheService.getResetOTP(email);
      if (!stored || stored !== otp) {
        return ResponseHelper.error(res, 'Mã OTP không hợp lệ hoặc đã hết hạn', 400);
      }

      // Optional: validate username-email pair if username is provided
      let user;
      if (username) {
        user = await User.findByUsername(username);
        if (!user || (user.email || '').trim().toLowerCase() !== email.trim().toLowerCase()) {
          return ResponseHelper.error(res, 'Tài khoản hoặc email không khớp', 400);
        }
      } else {
        user = await User.findByEmail(email);
      }
      if (!user) return ResponseHelper.error(res, 'Không tìm thấy người dùng', 404);

      // For current DB (no password hash column used consistently), store both hash and plain for backward compatibility
      let newPassword;
  const allowTemp = (process.env.RESET_ALLOW_TEMP_PASSWORD || 'false').toLowerCase() === 'true';
      if (!allowTemp) {
        mode = 'new';
      }
      if (mode === 'new') {
        const { newPassword: np, confirmNewPassword: cnp } = req.body;
        if (!np || !cnp) return ResponseHelper.error(res, 'Thiếu mật khẩu mới hoặc xác nhận mật khẩu', 400);
        if (np !== cnp) return ResponseHelper.error(res, 'Mật khẩu xác nhận không khớp', 400);
        newPassword = np;
        if (newPassword.length < 6) return ResponseHelper.error(res, 'Mật khẩu tối thiểu 6 ký tự', 400);
      } else {
        newPassword = generateTempPassword();
      }

      const ok = await User.updatePassword(user.id, newPassword);
      if (!ok) return ResponseHelper.error(res, 'Không thể cập nhật mật khẩu', 500);

      // Invalidate OTP
  await CacheService.deleteResetOTP(email);
  // Reset attempts counter
  try { if (CacheService.isConnected) await CacheService.client.del(`pwd:attempt:${email}`); } catch {}

      // Notify by email if using temp password
  if (mode !== 'new' && allowTemp) {
        const subject = 'Mật khẩu tạm thời (VMU Quiz)';
        const html = `
          <p>Mật khẩu tạm thời của bạn là: <b>${newPassword}</b></p>
          <p>Hãy đăng nhập và đổi mật khẩu ngay sau khi vào hệ thống.</p>
        `;
        const mailResult = await EmailService.sendMail({ to: email, subject, html, text: `Temp password: ${newPassword}` });
        if (!mailResult.success) {
          return ResponseHelper.error(res, 'Không thể gửi mật khẩu tạm: ' + mailResult.error, 500);
        }
        return ResponseHelper.success(res, { message: 'Đặt lại mật khẩu thành công', mode: 'temp' });
      }
      return ResponseHelper.success(res, { message: 'Đặt lại mật khẩu thành công', mode: 'new' });
    } catch (err) {
      console.error('verifyAndReset error:', err);
      return ResponseHelper.error(res, 'Lỗi server', 500);
    }
  }
}

module.exports = PasswordResetController;
