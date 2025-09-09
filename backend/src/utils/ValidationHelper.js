// Validation utilities for VMU Quiz System

class ValidationHelper {
  // Validate email format
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate Vietnamese phone number
  static isValidPhoneNumber(phone) {
    const phoneRegex = /^(0|\+84)[3-9][0-9]{8}$/;
    return phoneRegex.test(phone);
  }

  // Validate student code format (VMU format)
  static isValidStudentCode(code) {
    const codeRegex = /^[A-Z]{2,4}\d{6,8}$/;
    return codeRegex.test(code);
  }

  // Validate password strength
  static isValidPassword(password) {
    if (!password || password.length < 6) {
      return {
        valid: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự"
      };
    }
    return { valid: true };
  }

  // Validate username format
  static isValidUsername(username) {
    if (!username || username.length < 3) {
      return {
        valid: false,
        message: "Tên đăng nhập phải có ít nhất 3 ký tự"
      };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return {
        valid: false,
        message: "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"
      };
    }
    
    return { valid: true };
  }

  // Validate question content
  static isValidQuestionContent(content) {
    if (!content || content.trim().length < 10) {
      return {
        valid: false,
        message: "Nội dung câu hỏi phải có ít nhất 10 ký tự"
      };
    }
    return { valid: true };
  }

  // Validate exam answers format
  static isValidExamAnswers(answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      return {
        valid: false,
        message: "Danh sách câu trả lời không hợp lệ"
      };
    }

    for (let answer of answers) {
      if (!answer.question_id || !answer.answer_id) {
        return {
          valid: false,
          message: "Mỗi câu trả lời phải có question_id và answer_id"
        };
      }
    }

    return { valid: true };
  }

  // Sanitize input to prevent XSS
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  // Validate topic data
  static validateTopicData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
      errors.push("Tên chuyên đề phải có ít nhất 3 ký tự");
    }

    if (data.description && data.description.length > 500) {
      errors.push("Mô tả chuyên đề không được vượt quá 500 ký tự");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate user registration data
  static validateUserData(data) {
    const errors = [];

    const usernameCheck = this.isValidUsername(data.username);
    if (!usernameCheck.valid) {
      errors.push(usernameCheck.message);
    }

    const passwordCheck = this.isValidPassword(data.password);
    if (!passwordCheck.valid) {
      errors.push(passwordCheck.message);
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push("Email không hợp lệ");
    }

    if (data.phone && !this.isValidPhoneNumber(data.phone)) {
      errors.push("Số điện thoại không hợp lệ");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = ValidationHelper;
