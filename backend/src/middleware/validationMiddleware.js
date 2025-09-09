const InputValidator = require('../utils/InputValidator');

/**
 * Validation Rules cho các chức năng cụ thể
 */

const ValidationRules = {
  
  // Rules cho Student
  student: {
    fullName: {
      type: 'name',
      options: { required: true, minLength: 2, maxLength: 100 }
    },
    email: {
      type: 'email',
      options: { required: true, maxLength: 100 }
    },
    phoneNumber: {
      type: 'phone',
      options: { required: false, maxLength: 15 }
    },
    studentCode: {
      type: 'studentCode',
      options: { required: true, minLength: 3, maxLength: 20 }
    },
    dateOfBirth: {
      type: 'safeText',
      options: { required: true, maxLength: 10 }
    },
    classId: {
      type: 'numeric',
      options: { required: true }
    }
  },

  // Rules cho User/Auth
  auth: {
    username: {
      type: 'username',
      options: { required: true, minLength: 3, maxLength: 50 }
    },
    password: {
      type: 'password',
      options: { required: true, minLength: 6, maxLength: 100 }
    },
    email: {
      type: 'email',
      options: { required: true, maxLength: 100 }
    },
    fullName: {
      type: 'name',
      options: { required: true, minLength: 2, maxLength: 100 }
    }
  },

  // Rules cho Topic/Subject
  topic: {
    name: {
      type: 'safeText',
      options: { required: true, minLength: 2, maxLength: 200 }
    },
    description: {
      type: 'safeText',
      options: { required: false, maxLength: 1000 }
    },
    duration_minutes: {
      type: 'numeric',
      options: { required: true, min: 1 }
    },
    pass_score: {
      type: 'numeric',
      options: { required: true, min: 0, max: 100 }
    },
    departmentId: {
      type: 'numeric',
      options: { required: false }
    },
    majorId: {
      type: 'numeric',
      options: { required: false }
    }
  },

  // Rules cho Question
  question: {
    content: {
      type: 'safeText',
      options: { required: true, minLength: 5, maxLength: 1000 }
    },
    topicId: {
      type: 'numeric',
      options: { required: true }
    }
  },

  // Rules cho Answer
  answer: {
    content: {
      type: 'safeText',
      options: { required: true, minLength: 1, maxLength: 500 }
    },
    questionId: {
      type: 'numeric',
      options: { required: true }
    }
  },

  // Rules cho Department/Major/Class
  academic: {
    name: {
      type: 'safeText',
      options: { required: true, minLength: 2, maxLength: 200 }
    },
    code: {
      type: 'alphanumeric',
      options: { required: false, maxLength: 50 }
    },
    description: {
      type: 'safeText',
      options: { required: false, maxLength: 500 }
    }
  },

  // Rules riêng cho Major
  major: {
    name: {
      type: 'safeText',
      options: { required: true, minLength: 2, maxLength: 200 }
    },
    department_id: {
      type: 'numeric',
      options: { required: true }
    }
  },

  // Rules riêng cho Class
  class: {
    name: {
      type: 'safeText',
      options: { required: true, minLength: 2, maxLength: 200 }
    },
    major_id: {
      type: 'numeric',
      options: { required: true }
    }
  },

  // Rules cho Change Password
  changePassword: {
    currentPassword: {
      type: 'password',
      options: { required: true, minLength: 1, maxLength: 100 }
    },
    newPassword: {
      type: 'password',
      options: { required: true, minLength: 6, maxLength: 100 }
    },
    confirmPassword: {
      type: 'password',
      options: { required: true, minLength: 6, maxLength: 100 }
    }
  }
};

/**
 * Middleware functions để sử dụng trong routes
 */
const ValidationMiddleware = {
  
  // Validate student data
  validateStudent: InputValidator.middleware(ValidationRules.student),
  
  // Validate student data for add (chỉ validate fields có trong request)
  validateAddStudent: (req, res, next) => {
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.student, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    // Merge sanitized data back to req.body
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  },
  
  // Validate auth data
  validateAuth: InputValidator.middleware(ValidationRules.auth),
  
  // Validate topic data
  validateTopic: InputValidator.middleware(ValidationRules.topic),
  
  // Validate question data
  validateQuestion: InputValidator.middleware(ValidationRules.question),
  
  // Validate answer data
  validateAnswer: InputValidator.middleware(ValidationRules.answer),
  
  // Validate academic structure data
  validateAcademic: InputValidator.middleware(ValidationRules.academic),
  
  // Validate major data
  validateMajor: InputValidator.middleware(ValidationRules.major),
  
  // Validate class data
  validateClass: InputValidator.middleware(ValidationRules.class),
  
  // Validate change password
  validateChangePassword: InputValidator.middleware(ValidationRules.changePassword),

  // Custom validation for partial updates
  validatePartialStudent: (req, res, next) => {
    // Chỉ validate các fields có trong request (validateAll = false)
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.student, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    // Merge sanitized data back to req.body
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  },

  // Validate partial topic data
  validatePartialTopic: (req, res, next) => {
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.topic, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  },

  // Validate partial question data
  validatePartialQuestion: (req, res, next) => {
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.question, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  },

  // Validate partial academic data
  validatePartialAcademic: (req, res, next) => {
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.academic, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  },

  // Validate partial major data
  validatePartialMajor: (req, res, next) => {
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.major, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  },

  // Validate partial class data
  validatePartialClass: (req, res, next) => {
    const validationResult = InputValidator.validateObject(req.body, ValidationRules.class, false);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: validationResult.errors
      });
    }
    
    Object.keys(validationResult.sanitized).forEach(field => {
      req.body[field] = validationResult.sanitized[field];
    });
    
    next();
  }
};

module.exports = {
  ValidationRules,
  ValidationMiddleware,
  InputValidator
};
