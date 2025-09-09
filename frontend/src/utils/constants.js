// Application constants

export const APP_CONFIG = {
  NAME: 'VMU Quiz System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Hệ thống Trắc nghiệm Sinh hoạt Công dân',
  UNIVERSITY: 'Đại học Việt Minh'
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/login',
  LOGOUT: '/logout',
  ME: '/me',
  REFRESH_TOKEN: '/refresh-token',
  
  // Topics
  TOPICS: '/topics',
  TOPIC_BY_ID: (id) => `/topics/${id}`,
  TOPIC_QUESTIONS: (id) => `/topics/${id}/questions`,
  
  // Questions
  QUESTIONS: '/questions',
  QUESTION_BY_ID: (id) => `/questions/${id}`,
  
  // Exams
  START_EXAM: '/exams/start',
  EXAM_BY_ID: (id) => `/exams/${id}`,
  SUBMIT_EXAM: (id) => `/exams/${id}/submit`,
  STUDENT_EXAM_HISTORY: '/exams/student/history',
  EXAM_ANSWERS: (id) => `/exams/${id}/answers`,
  
  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_EXAMS: '/admin/exams',
  
  // Test
  TEST: '/test'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student'
};

export const EXAM_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired'
};

export const ROUTES = {
  // Public
  LOGIN: '/login',
  
  // Student
  STUDENT_SUBJECTS: '/student/subjects',
  STUDENT_QUIZ: '/student/quiz/:subjectId',
  STUDENT_PROFILE: '/student/profile',
  STUDENT_HISTORY: '/student/history',
  STUDENT_RESULT: '/student/result/:examId',
  
  // Admin
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_STUDENTS: '/admin/students',
  
  // Other
  NOT_FOUND: '/404'
};

export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  REFRESH_TOKEN: 'refreshToken'
};

export const MESSAGES = {
  // Success
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  EXAM_SUBMITTED: 'Nộp bài thành công',
  
  // Errors
  LOGIN_FAILED: 'Đăng nhập thất bại',
  NETWORK_ERROR: 'Lỗi kết nối mạng',
  UNAUTHORIZED: 'Không có quyền truy cập',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn',
  
  // Validation
  REQUIRED_FIELD: 'Trường này là bắt buộc',
  INVALID_EMAIL: 'Email không hợp lệ',
  INVALID_PASSWORD: 'Mật khẩu phải có ít nhất 6 ký tự',
  
  // Loading
  LOADING: 'Đang tải...',
  SUBMITTING: 'Đang gửi...',
  PLEASE_WAIT: 'Vui lòng đợi...'
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]{3,20}$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 50
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PHONE: {
    PATTERN: /^(0|\+84)[3-9][0-9]{8}$/
  },
  STUDENT_CODE: {
    PATTERN: /^[A-Z]{2,4}\d{6,8}$/
  }
};

export const EXAM_CONFIG = {
  DEFAULT_TIME_LIMIT: 30, // minutes
  WARNING_TIME: 5, // minutes before end
  AUTO_SUBMIT_TIME: 0 // auto submit when time is up
};

export const UI_CONFIG = {
  TOAST_DURATION: 3000, // milliseconds
  LOADING_DELAY: 500, // milliseconds
  DEBOUNCE_DELAY: 300 // milliseconds
};
