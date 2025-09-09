const validator = require('validator');

/**
 * Input Validation và Sanitization Utils
 * Bảo vệ toàn bộ hệ thống khỏi SQL Injection, XSS và các lỗ hổng bảo mật khác
 */

class InputValidator {
  
  /**
   * Danh sách ký tự nguy hiểm có thể gây SQL Injection
   */
  static DANGEROUS_SQL_CHARS = [
    '--',           // SQL comment
    '/*',           // SQL block comment start
    '*/',           // SQL block comment end
    ';',            // SQL statement separator
    'UNION',        // SQL UNION keyword
    'SELECT',       // SQL SELECT keyword
    'INSERT',       // SQL INSERT keyword
    'UPDATE',       // SQL UPDATE keyword
    'DELETE',       // SQL DELETE keyword
    'DROP',         // SQL DROP keyword
    'CREATE',       // SQL CREATE keyword
    'ALTER',        // SQL ALTER keyword
    'EXEC',         // SQL EXEC keyword
    'EXECUTE',      // SQL EXECUTE keyword
    'SCRIPT',       // Script tag
    'JAVASCRIPT',   // JavaScript keyword
    'VBSCRIPT',     // VBScript keyword
    'ONLOAD',       // Event handler
    'ONERROR'       // Event handler
  ];

  /**
   * Regex patterns cho validation
   */
  static PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\-\+\(\)\s]+$/,
    studentCode: /^[A-Za-z0-9]+$/,
    username: /^[A-Za-z0-9_]+$/,
    password: /^.{6,50}$/,
    name: /^[A-Za-zÀ-ỹ\s]+$/u,
    safeText: /^[A-Za-z0-9\sÀ-ỹ\.,\-_!?()]+$/u,
    numeric: /^\d+$/,
    alphanumeric: /^[A-Za-z0-9]+$/
  };

  /**
   * Kiểm tra input có chứa ký tự nguy hiểm không
   * @param {string} input - Input cần kiểm tra
   * @returns {boolean} - True nếu có ký tự nguy hiểm
   */
  static containsDangerousChars(input) {
    if (!input || typeof input !== 'string') return false;
    
    const upperInput = input.toUpperCase();
    return this.DANGEROUS_SQL_CHARS.some(char => upperInput.includes(char));
  }

  /**
   * Sanitize input - Loại bỏ/escape ký tự nguy hiểm
   * @param {string} input - Input cần sanitize
   * @returns {string} - Input đã được sanitize
   */
  static sanitize(input) {
    if (!input || typeof input !== 'string') return input;
    
    return input
      .replace(/'/g, "''")           // Escape single quotes
      .replace(/"/g, '""')           // Escape double quotes
      .replace(/\\/g, '\\\\')        // Escape backslashes
      .replace(/--/g, '\\-\\-')      // Escape SQL comments
      .replace(/\/\*/g, '\\/\\*')    // Escape block comments
      .replace(/\*\//g, '\\*\\/')    // Escape block comments
      .replace(/;/g, '\\;')          // Escape statement separator
      .trim();
  }

  /**
   * Validate và sanitize input chung
   * @param {string} input - Input cần validate
   * @param {string} type - Loại validation ('email', 'phone', 'name', etc.)
   * @param {object} options - Tùy chọn thêm
   * @returns {object} - { isValid: boolean, sanitized: string, errors: array }
   */
  static validateAndSanitize(input, type = 'safeText', options = {}) {
    const result = {
      isValid: true,
      sanitized: input,
      errors: []
    };

    // Kiểm tra null/undefined/empty
    if (input === null || input === undefined || input === '') {
      if (options.required !== false) {
        result.isValid = false;
        result.errors.push(`${type} là bắt buộc`);
      }
      return result;
    }

    // Chuyển về string
    const inputStr = String(input).trim();
    
    // Kiểm tra chuỗi rỗng sau trim
    if (inputStr === '') {
      if (options.required !== false) {
        result.isValid = false;
        result.errors.push(`${type} là bắt buộc`);
      }
      return result;
    }
    
    // Kiểm tra độ dài
    if (options.minLength && inputStr.length < options.minLength) {
      result.isValid = false;
      result.errors.push(`${type} phải có ít nhất ${options.minLength} ký tự`);
    }
    
    if (options.maxLength && inputStr.length > options.maxLength) {
      result.isValid = false;
      result.errors.push(`${type} không được vượt quá ${options.maxLength} ký tự`);
    }

    // Kiểm tra ký tự nguy hiểm
    if (this.containsDangerousChars(inputStr)) {
      result.isValid = false;
      result.errors.push(`${type} chứa ký tự không được phép (có thể gây lỗi bảo mật)`);
      return result; // Không sanitize nếu có ký tự nguy hiểm
    }

    // Validate theo pattern
    if (this.PATTERNS[type] && !this.PATTERNS[type].test(inputStr)) {
      result.isValid = false;
      result.errors.push(`${type} không đúng định dạng`);
    }

    // Validate theo custom validator
    switch (type) {
      case 'email':
        if (!validator.isEmail(inputStr)) {
          result.isValid = false;
          result.errors.push('Email không đúng định dạng');
        }
        break;
      
      case 'phone':
        if (!validator.isMobilePhone(inputStr, 'vi-VN')) {
          // Nếu không phải SĐT VN, kiểm tra định dạng chung
          if (!this.PATTERNS.phone.test(inputStr)) {
            result.isValid = false;
            result.errors.push('Số điện thoại không đúng định dạng');
          }
        }
        break;
      
      case 'numeric':
        const numValue = parseInt(inputStr);
        if (isNaN(numValue)) {
          result.isValid = false;
          result.errors.push(`${type} phải là số`);
        } else {
          // Kiểm tra min/max value
          if (options.min !== undefined && numValue < options.min) {
            result.isValid = false;
            result.errors.push(`${type} phải lớn hơn hoặc bằng ${options.min}`);
          }
          if (options.max !== undefined && numValue > options.max) {
            result.isValid = false;
            result.errors.push(`${type} phải nhỏ hơn hoặc bằng ${options.max}`);
          }
        }
        break;
    }

    // Sanitize nếu hợp lệ
    if (result.isValid) {
      result.sanitized = this.sanitize(inputStr);
    }

    return result;
  }

  /**
   * Validate object với nhiều fields
   * @param {object} data - Object chứa data cần validate
   * @param {object} rules - Rules validation cho từng field
   * @param {boolean} validateAll - Nếu true, validate tất cả rules. Nếu false, chỉ validate fields có trong data
   * @returns {object} - { isValid: boolean, sanitized: object, errors: object }
   */
  static validateObject(data, rules, validateAll = false) {
    const result = {
      isValid: true,
      sanitized: {},
      errors: {}
    };

    for (const [field, rule] of Object.entries(rules)) {
      // Nếu validateAll = false, chỉ validate field có trong data
      if (!validateAll && !data.hasOwnProperty(field)) {
        continue;
      }
      
      const fieldResult = this.validateAndSanitize(data[field], rule.type, rule.options || {});
      
      result.sanitized[field] = fieldResult.sanitized;
      
      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors[field] = fieldResult.errors;
      }
    }

    return result;
  }

  /**
   * Middleware Express để validate request body
   * @param {object} rules - Rules validation
   * @returns {function} - Express middleware
   */
  static middleware(rules) {
    return (req, res, next) => {
      const validationResult = this.validateObject(req.body, rules);
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu đầu vào không hợp lệ',
          errors: validationResult.errors
        });
      }
      
      // Thay thế req.body bằng dữ liệu đã sanitize
      req.body = validationResult.sanitized;
      next();
    };
  }
}

module.exports = InputValidator;
