// VMU Quiz System API
const API_URL = process.env.REACT_APP_API_URL || '/api';

const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include' // send cookies
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
  const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth APIs
export const loginUser = async (username, password) => {
  const data = await fetchApi('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  return data.data; // Return { token, user, refreshToken }
};

export const logoutUser = async () => {
  try {
    await fetchApi('/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return { success: true };
};

export const getCurrentUser = async () => {
  const data = await fetchApi('/me');
  return data.data.user;
};

export const refreshToken = async (refreshToken) => {
  const data = await fetchApi('/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  return data.data;
};

// Topics APIs
export const getTopics = async () => {
  const data = await fetchApi('/topics');
  return data.data.topics;
};

export const getTopicById = async (id) => {
  const data = await fetchApi(`/topics/${id}`);
  return data.data.topic;
};

export const getTopicQuestions = async (topicId) => {
  const data = await fetchApi(`/topics/${topicId}/questions`);
  return data.data.questions;
};

// Admin Topic Management
export const createTopic = async (name, description) => {
  const data = await fetchApi('/topics', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  });
  return data;
};

export const updateTopic = async (id, name, description) => {
  const data = await fetchApi(`/topics/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description })
  });
  return data;
};

export const deleteTopic = async (id) => {
  const data = await fetchApi(`/topics/${id}`, {
    method: 'DELETE'
  });
  return data;
};

// Questions APIs (Admin only)
export const createQuestion = async (topicId, content, answers) => {
  const data = await fetchApi('/questions', {
    method: 'POST',
    body: JSON.stringify({ topic_id: topicId, content, answers })
  });
  return data;
};

export const updateQuestion = async (id, content, answers) => {
  const data = await fetchApi(`/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content, answers })
  });
  return data;
};

export const deleteQuestion = async (id) => {
  const data = await fetchApi(`/questions/${id}`, {
    method: 'DELETE'
  });
  return data;
};

// Exam APIs
export const startExam = async (topicId) => {
  const data = await fetchApi('/exams/start', {
    method: 'POST',
    body: JSON.stringify({ topic_id: topicId })
  });
  return data.data;
};

export const getExam = async (examId) => {
  const data = await fetchApi(`/exams/${examId}`);
  return data.data;
};

export const submitExam = async (examId, answers) => {
  const data = await fetchApi(`/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
  return data.data;
};

export const getStudentExamHistory = async () => {
  const data = await fetchApi('/exams/student/history');
  return data.data.exams;
};

export const getExamAnswers = async (examId) => {
  const data = await fetchApi(`/exams/${examId}/answers`);
  return data.data;
};

// Admin APIs
export const getAllUsers = async () => {
  const data = await fetchApi('/admin/users');
  return data.data.users;
};

export const getAllExams = async () => {
  const data = await fetchApi('/admin/exams');
  return data.data.exams;
};

// Test API
export const testConnection = async () => {
  const data = await fetchApi('/test');
  return data;
};

// Create an API client object with common HTTP methods
const apiClient = {
  get: (endpoint) => fetchApi(endpoint, { method: 'GET' }),
  post: (endpoint, data) => fetchApi(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  put: (endpoint, data) => fetchApi(endpoint, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (endpoint) => fetchApi(endpoint, { method: 'DELETE' }),
  patch: (endpoint, data) => fetchApi(endpoint, { 
    method: 'PATCH', 
    body: JSON.stringify(data) 
  })
};

export default apiClient;
