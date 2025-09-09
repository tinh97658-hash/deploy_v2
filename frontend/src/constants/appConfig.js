// Application Configuration Constants
export const APP_CONFIG = {
  NAME: 'VMU Quiz System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Hệ thống thi trắc nghiệm tuần sinh hoạt công dân',
  AUTHOR: 'VMU Development Team'
};

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  REFRESH_TOKEN: 'refreshToken',
  USER_PROGRESS: 'userProgress',
  THEME: 'theme',
  LANGUAGE: 'language'
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  USERNAME_MIN_LENGTH: 3,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif']
};
