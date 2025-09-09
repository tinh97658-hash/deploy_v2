// Environment Configuration
const config = {
  development: {
  API_BASE_URL: process.env.REACT_APP_API_URL || '/api',
    APP_NAME: 'VMU Quiz Development',
    DEBUG: true
  },
  production: {
    API_BASE_URL: process.env.REACT_APP_API_URL || '/api',
    APP_NAME: 'VMU Quiz',
    DEBUG: false
  },
  test: {
  API_BASE_URL: '/api',
    APP_NAME: 'VMU Quiz Test',
    DEBUG: true
  }
};

const env = process.env.NODE_ENV || 'development';

export default config[env];
