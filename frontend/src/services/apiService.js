// VMU Quiz System API
const API_URL = process.env.REACT_APP_API_URL || '/api';

const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
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
    console.log(`Fetching ${url} with method: ${config.method || 'GET'}`);
  const response = await fetch(url, config);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
      console.warn('Non-JSON response received:', data);
      try {
        // Try to parse it anyway
        data = JSON.parse(data);
      } catch (e) {
        console.error('Could not parse response as JSON');
      }
    }
    
    if (!response.ok) {
      console.error(`API error: ${response.status} - ${data.message || 'API request failed'}`);
      const error = new Error(data.message || 'API request failed');
      error.response = {
        status: response.status,
        data: data
      };
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Export fetchApi as apiRequest for backward compatibility
export const apiRequest = fetchApi;

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
    localStorage.removeItem('user');
  }
  return { success: true };
};

export const getCurrentUser = async () => {
  const data = await fetchApi('/me');
  return data.data.user;
};

export const refreshToken = async () => {
  const data = await fetchApi('/refresh-token', { method: 'POST' });
  return data.data; // server sets new cookie
};

// Password reset APIs
export const requestPasswordReset = async (username, email) => {
  const data = await fetchApi('/auth/request-reset', {
    method: 'POST',
  body: JSON.stringify({ username, email })
  });
  return data;
};

export const verifyResetOtpOnly = async ({ username, email, otp }) => {
  const data = await fetchApi('/auth/verify-otp', {
    method: 'POST',
  body: JSON.stringify({ username, email, otp })
  });
  return data;
};

export const verifyResetAndSetPassword = async ({ username, email, otp, mode = 'new', newPassword, confirmNewPassword }) => {
  const payload = { username, email, otp, mode };
  // Always require new password + confirmation in production flow
  payload.newPassword = newPassword;
  if (confirmNewPassword !== undefined) payload.confirmNewPassword = confirmNewPassword;
  const data = await fetchApi('/auth/verify-reset', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data;
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
export const createTopic = async (name, description, duration_minutes, pass_score) => {
  const data = await fetchApi('/topics', {
    method: 'POST',
    body: JSON.stringify({ name, description, duration_minutes, pass_score })
  });
  return data.data;
};

export const updateTopic = async (id, name, description, duration_minutes, pass_score) => {
  const data = await fetchApi(`/topics/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description, duration_minutes, pass_score })
  });
  return data.data;
};

export const deleteTopic = async (id, { force = false } = {}) => {
  const suffix = force ? `?force=true` : '';
  const data = await fetchApi(`/topics/${id}${suffix}`, {
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

// Student Management APIs
export const getStudents = async () => {
  const data = await fetchApi('/admin/students');
  return data.data || [];
};

export const addStudent = async (studentData) => {
  try {
    console.log('Sending student data to API:', studentData);
    const data = await fetchApi('/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    console.log('API response for addStudent:', data);
    return data.data;
  } catch (error) {
    console.error('Failed to add student:', error);
    throw new Error(error.message || 'Không thể thêm sinh viên, vui lòng thử lại sau.');
  }
};

export const updateStudent = async (studentData) => {
  const data = await fetchApi(`/admin/students/${studentData.id}`, {
    method: 'PUT',
    body: JSON.stringify(studentData)
  });
  return data.data;
};

export const deleteStudent = async (id) => {
  const data = await fetchApi(`/admin/students/${id}`, {
    method: 'DELETE'
  });
  return data;
};

export const bulkDeleteStudents = async (ids) => {
  const data = await fetchApi('/admin/students', {
    method: 'DELETE',
    body: JSON.stringify({ ids })
  });
  return data;
};

export const searchStudents = async (searchTerm, filters = {}) => {
  const params = new URLSearchParams();
  if (searchTerm) params.append('q', searchTerm);
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.majorId) params.append('majorId', filters.majorId);
  if (filters.classId) params.append('classId', filters.classId);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/admin/students/search?${queryString}` : '/admin/students';
  
  const data = await fetchApi(endpoint);
  return data.data || [];
};

// Academic Structure APIs
export const getDepartments = async () => {
  try {
    console.log('Calling getDepartments API...');
    const data = await fetchApi('/admin/departments');
    
    // Detailed logging to inspect the response
    console.log('getDepartments raw response:', data);
    
    // Ensure we're getting an array and each item has the expected format
    const departments = Array.isArray(data.data) ? data.data.map(dept => {
      console.log('Department item:', dept);
      // Ensure each department has id and name properties
      return {
        id: dept.id || dept._id || String(Math.random()),
        name: dept.name || 'Unnamed Department'
      };
    }) : [];
    
    console.log('Processed departments:', departments);
    return departments;
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return [];
  }
};

export const getMajorsByDepartment = async (departmentId) => {
  const data = await fetchApi(`/admin/departments/${departmentId}/majors`);
  return data.data || [];
};

export const getClassesByMajor = async (majorId) => {
  const data = await fetchApi(`/admin/majors/${majorId}/classes`);
  return data.data || [];
};

// Subject/Topic aliases - Use the dedicated student subjects endpoint
export const getSubjects = async (params = {}) => {
  try {
    let userRole = 'student';
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userRole = user.type || user.role;
    } catch {}

    let endpoint = '/student/subjects';
    
    // Check if this is called from admin page or explicit admin request
    const isAdminRequest = params.forceAdmin === true || 
                          (userRole === 'admin' && !params.forceStudent);
    
    // Force student endpoint if explicitly requested
    if (params.forceStudent === true) {
      endpoint = '/student/subjects';
    } else if (isAdminRequest && userRole === 'admin') {
      endpoint = '/topics';
      
      // Add pagination params for admin
      if (params.page || params.limit || params.search) {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        endpoint += '?' + queryParams.toString();
      }
    }

    const response = await fetchApi(endpoint);

    // For admin with pagination
    if (userRole === 'admin' && response && response.data) {
      return {
        subjects: response.data.topics || [],
        pagination: response.data.pagination || null,
        metadata: response.data.metadata || {},
        raw: response
      };
    }

    // Backend chuẩn: { success, message, data: { subjects: [], studentInfo, metadata } }
    if (response && response.data && Array.isArray(response.data.subjects)) {
      return {
        subjects: response.data.subjects,
        studentInfo: response.data.studentInfo || null,
        metadata: response.data.metadata || {},
        raw: response
      };
    }
    // Admin /topics: { success, message, data: { topics: [] } }
    if (response && response.data && Array.isArray(response.data.topics)) {
      return {
        subjects: response.data.topics,
        studentInfo: null,
        metadata: { total: response.data.total },
        raw: response
      };
    }
    // Trường hợp trả trực tiếp { topics: [] }
    if (response && Array.isArray(response.topics)) {
      return {
        subjects: response.topics,
        studentInfo: null,
        metadata: { total: response.total },
        raw: response
      };
    }
    // Trường hợp backend trả trực tiếp { subjects: [] }
    if (response && Array.isArray(response.subjects)) {
      return {
        subjects: response.subjects,
        studentInfo: response.studentInfo || null,
        metadata: response.metadata || {},
        raw: response
      };
    }
    // Nếu trả về mảng trần
    if (Array.isArray(response)) {
      return { subjects: response, studentInfo: null, metadata: {}, raw: response };
    }
    // Fallback: không đúng format
    return { subjects: [], studentInfo: null, metadata: { parseWarning: true }, raw: response };
  } catch (error) {
    console.error('Error fetching student subjects:', error);
    return { subjects: [], studentInfo: null, metadata: { error: true, message: error.message } };
  }
};

// Quiz specific APIs
export const getQuiz = async (topicId) => {
  console.log(`Fetching exam questions for topic ${topicId}`);
  try {
    // Use the new endpoint specifically designed for exams with schedule check
    const data = await fetchApi(`/topics/${topicId}/exam-questions`);
    console.log('Exam data received:', data);
    return data.data;
  } catch (error) {
    console.error('Error fetching exam questions:', error);
    // NO FALLBACK - Students must have valid schedule to access exam
    throw error;
  }
};

export const saveQuizResult = async (examId, answers) => {
  console.log(`Submitting exam ${examId} with ${Object.keys(answers).length} answers`);
  try {
    // Truyền thêm topicId nếu có
    const topicId = answers.topicId || null;
    const payload = topicId ? { answers: answers, topicId } : { answers };
    const data = await fetchApi(`/exams/${examId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    console.log('Exam submission result:', data);
    return data.data;
  } catch (error) {
    console.error('Error submitting exam:', error);
    throw error;
  }
};

// User progress APIs
export const getUserProgress = async (userId) => {
  const data = await fetchApi('/user/progress');
  return data.data;
};

export const canTakeQuiz = async (topicId) => {
  try {
    // Check if user can take quiz for this topic
    const data = await fetchApi(`/topics/${topicId}/can-take`);
    
    // Handle different response formats
    if (data && data.data && data.data.canTake !== undefined) {
      return data.data.canTake;
    }
    
    if (data && data.canTake !== undefined) {
      return data.canTake;
    }
    
    // If the endpoint returns a success status but no explicit canTake value,
    // assume the user can take the quiz (the backend already checked schedules)
    console.log('canTakeQuiz endpoint returned success but no explicit canTake value, assuming true');
    return true;
  } catch (error) {
    console.warn('Error checking can-take status, assuming quiz is available:', error);
    // If the endpoint fails or doesn't exist, fallback to allowing the quiz
    // The backend now handles schedule checking at the getStudentSubjects level
    return true;
  }
};

// Batch schedule APIs (for subjects page)
export const getBatchSchedules = async () => {
  const data = await fetchApi('/admin/schedules');
  return data.data;
};

export const createBatchSchedule = async (scheduleData) => {
  const data = await fetchApi('/admin/schedules', {
    method: 'POST',
    body: JSON.stringify(scheduleData)
  });
  return data;
};

export const deleteBatchSchedule = async (id) => {
  const data = await fetchApi(`/admin/schedules/${id}`, {
    method: 'DELETE'
  });
  return data;
};

export const updateBatchSchedule = async (id, updateData) => {
  const data = await fetchApi(`/admin/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  return data;
};

export const deleteAllBatchSchedules = async (departmentId) => {
  const url = departmentId ? `/admin/schedules?department_id=${departmentId}` : '/admin/schedules';
  const data = await fetchApi(url, { method: 'DELETE' });
  return data;
};

// === Schedule management dedicated helpers (used by SchedulesManagementPage) ===
export const getSchedules = async () => {
  const data = await fetchApi('/admin/schedules');
  return Array.isArray(data.data) ? data.data : [];
};

export const createSchedule = async (schedule) => {
  const payload = Array.isArray(schedule) ? schedule : { ...schedule };
  const data = await fetchApi('/admin/schedules', { method: 'POST', body: JSON.stringify(payload) });
  return data;
};

export const deleteSchedule = async (id) => {
  return await fetchApi(`/admin/schedules/${id}`, { method: 'DELETE' });
};

export const deleteAllSchedules = async () => {
  return await fetchApi('/admin/schedules', { method: 'DELETE' });
};

// Dashboard APIs
export const getDashboardData = async () => {
  const data = await fetchApi('/admin/dashboard');
  return data.data;
};

export const getDetailedStats = async () => {
  const data = await fetchApi('/admin/dashboard/stats');
  return data.data;
};

export const getRealtimeUpdates = async () => {
  const data = await fetchApi('/admin/dashboard/realtime');
  return data.data;
};

export const importQuestions = async (topicId, questions) => {
  console.log(`Sending ${questions.length} questions to /topics/${topicId}/import-questions`);
  
  // Clean and normalize questions data before sending
  const cleanedQuestions = questions.map(q => {
    // Ensure question text is a string
    const questionText = q.question !== undefined && q.question !== null 
      ? String(q.question).trim() 
      : '';
    
    // Clean and normalize options
    const cleanedOptions = Array.isArray(q.options) 
      ? q.options.map(opt => {
          // Convert option text to string, handle non-string values
          const text = opt.text !== undefined && opt.text !== null 
            ? String(opt.text) 
            : '';
          
          return {
            text: text,
            isCorrect: Boolean(opt.isCorrect)
          };
        }).filter(opt => opt.text.trim() !== '') // Remove empty options
      : [];
      
    return {
      question: questionText,
      options: cleanedOptions,
      type: q.type === 'multiple_choice' ? 'multiple_choice' : 'single_choice'
    };
  });
  
  // Log sample of first cleaned question for debugging
  if (cleanedQuestions.length > 0) {
    console.log('First cleaned question sample:', JSON.stringify(cleanedQuestions[0], null, 2));
  }
  
  // Add validation to ensure we only send valid questions
  const validQuestions = cleanedQuestions.filter(q => {
    // Check if question has content and at least 2 options
    const isValid = q.question && q.question.trim() !== '' && 
                   Array.isArray(q.options) && q.options.length >= 2;
    
    if (!isValid) {
      console.warn('Filtering out invalid question:', q);
    }
    return isValid;
  });
  
  console.log(`After validation: ${validQuestions.length} valid questions out of ${questions.length} original questions`);
  
  if (validQuestions.length === 0) {
    throw new Error('No valid questions found to import. Each question needs content and at least 2 options.');
  }
  
  try {
    console.log('Sending API request...');
    const startTime = Date.now();
    
    const data = await fetchApi(`/topics/${topicId}/import-questions`, {
      method: 'POST',
      body: JSON.stringify({ questions: validQuestions }),
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Source': 'excel-import'
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`Import request completed in ${duration}ms`);
    console.log('Import response:', data);
    
    // Enhanced response with additional context
    return {
      ...data,
      requestStats: {
        sentQuestions: validQuestions.length,
        processTime: `${duration}ms`
      }
    };
  } catch (error) {
    console.error('Import request failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

// Import câu hỏi từ file Excel
export async function importQuestionsExcel(topicId, formData) {
  const res = await fetch(`/api/topics/${topicId}/import-questions-excel`, {
    method: 'POST',
    body: formData,
    headers: {
      // Không đặt Content-Type, để browser tự set multipart/form-data
    }
  });
  
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Lỗi kết nối hoặc API trả về dữ liệu không hợp lệ. Kiểm tra lại đường dẫn hoặc backend.');
  }
  
  if (!res.ok) {
    throw new Error(data.message || `HTTP error! status: ${res.status}`);
  }
  
  return data.data;
}

const API_BASE_URL = '/api/students';

export async function importStudentsExcel(formData) {
  const res = await fetch(`${API_BASE_URL}/import-excel`, {
    method: 'POST',
    body: formData,
    headers: {
    // Cookies (httpOnly) used for auth now
    // Không đặt Content-Type, để browser tự set multipart/form-data
    }
  });
  
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Lỗi kết nối hoặc API trả về dữ liệu không hợp lệ');
  }
  
  if (!res.ok) {
    throw new Error(data?.message || 'Import thất bại');
  }
  
  // Extract the student data from response
  let students = data.data || data.students || [];
  
  // Đơn giản hóa: Nếu không phải mảng, trả về mảng rỗng thay vì lỗi
  if (!Array.isArray(students)) {
    console.warn("Expected students array but got:", typeof students);
    students = [];
  }
  
  // Chuyển tất cả các giá trị về string để tránh vấn đề kiểu dữ liệu
  return students.map(student => ({
    id: student.id || student.userId || student.user_id || null,
    studentId: String(student.studentCode || student.student_code || ''),
    fullName: String(student.fullName || student.full_name || ''),
    email: String(student.email || ''),
    phone: student.phoneNumber || student.phone_number || student.phone || null,
    dateOfBirth: student.dateOfBirth || student.date_of_birth || null,
    class: student.classId || student.class_id || null,
    status: 'active', // Mặc định là active
    username: String(student.username || ''),
    classId: student.classId || student.class_id || null
  }));
}

// ===== ACADEMIC STRUCTURE MANAGEMENT APIs =====

// Department APIs - Note: getDepartments is already defined above at line 259

export async function createDepartment(departmentData) {
  return fetchApi('/departments', {
    method: 'POST',
    body: JSON.stringify(departmentData)
  });
}

export async function updateDepartment(id, departmentData) {
  return fetchApi(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(departmentData)
  });
}

export async function deleteDepartment(id) {
  return fetchApi(`/departments/${id}`, {
    method: 'DELETE'
  });
}

// Major APIs
export async function getMajors() {
  return fetchApi('/majors');
}

export async function createMajor(majorData) {
  return fetchApi('/majors', {
    method: 'POST',
    body: JSON.stringify(majorData)
  });
}

export async function updateMajor(id, majorData) {
  return fetchApi(`/majors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(majorData)
  });
}

export async function deleteMajor(id) {
  return fetchApi(`/majors/${id}`, {
    method: 'DELETE'
  });
}

// Class APIs
export async function getClasses() {
  return fetchApi('/classes');
}

export async function createClass(classData) {
  return fetchApi('/classes', {
    method: 'POST',
    body: JSON.stringify(classData)
  });
}

export async function updateClass(id, classData) {
  return fetchApi(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(classData)
  });
}

export async function deleteClass(id) {
  return fetchApi(`/classes/${id}`, {
    method: 'DELETE'
  });
}

// Bulk delete questions
export async function bulkDeleteQuestions(questionIds) {
  return fetchApi('/questions/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ questionIds })
  });
}

// Delete all questions of a topic
export async function deleteAllTopicQuestions(topicId) {
  return fetchApi(`/topics/${topicId}/questions/all`, {
    method: 'DELETE'
  });
}
