const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { ValidationMiddleware } = require('../middleware/validationMiddleware');
const AuthController = require('../controllers/authController');
const TopicController = require('../controllers/topicController');
const asyncHandler = require('../core/http/asyncHandler');
const UserProgressController = require('../controllers/userProgressController');
const StudentController = require('../controllers/studentController');
const AcademicStructureController = require('../controllers/academicStructureController');
const DashboardController = require('../controllers/dashboardController');
const ScheduleController = require('../controllers/scheduleController');
const StudentSubjectsController = require('../controllers/studentSubjectsController');
const ReportController = require('../controllers/reportController');
const AdvancedReportController = require('../controllers/advancedReportController');
const PasswordResetController = require('../controllers/passwordResetController');
const { authenticateToken, requireAdmin, requireStudent, requireAuth } = require('../middleware/authMiddleware');
const StudentAccountController = require('../controllers/studentAccountController');

// Import separate route modules
const departmentRoutes = require('./departmentRoutes');
const majorRoutes = require('./majorRoutes');
const classRoutes = require('./classRoutes');

// ============= AUTH ROUTES =============
// Public routes (không cần authentication)
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes (cần authentication)
router.get('/verify-token', authenticateToken, AuthController.verifyToken);

// ============= PASSWORD RESET (public) =============
router.post('/auth/request-reset', ValidationMiddleware.validateAuth, asyncHandler(PasswordResetController.requestReset));
router.post('/auth/verify-otp', ValidationMiddleware.validateAuth, asyncHandler(PasswordResetController.verifyOTPOnly));
router.post('/auth/verify-reset', ValidationMiddleware.validateAuth, asyncHandler(PasswordResetController.verifyAndReset));

// ============= TOPIC ROUTES =============
// Routes cho topics/subjects
router.get('/topics', authenticateToken, asyncHandler(TopicController.getTopics));
router.post('/topics', authenticateToken, requireAdmin, ValidationMiddleware.validateTopic, asyncHandler(TopicController.createTopic));
router.get('/topics/:id', authenticateToken, asyncHandler(TopicController.getTopicById));
router.put('/topics/:id', authenticateToken, requireAdmin, ValidationMiddleware.validatePartialTopic, asyncHandler(TopicController.updateTopic));
router.delete('/topics/:id', authenticateToken, requireAdmin, asyncHandler(TopicController.deleteTopic));
router.get('/topics/:id/questions', authenticateToken, asyncHandler(TopicController.getTopicQuestions));
router.post('/topics/:id/import-questions-excel', authenticateToken, requireAdmin, upload.single('file'), asyncHandler(TopicController.importQuestionsExcel));
router.delete('/questions/:id', authenticateToken, requireAdmin, asyncHandler(TopicController.deleteQuestion));
router.delete('/questions/bulk', authenticateToken, requireAdmin, asyncHandler(TopicController.bulkDeleteQuestions));
router.delete('/topics/:id/questions/all', authenticateToken, requireAdmin, asyncHandler(TopicController.deleteAllTopicQuestions));
router.put('/questions/:id', authenticateToken, ValidationMiddleware.validatePartialQuestion, asyncHandler(TopicController.updateQuestion));
// Đồng bộ lại question_count thủ công (admin)
router.post('/topics-sync/question-counts', authenticateToken, requireAdmin, asyncHandler(TopicController.syncQuestionCounts));

// ============= ADMIN ROUTES =============
// Chỉ admin mới có thể truy cập

// Dashboard Routes
router.get('/admin/dashboard', authenticateToken, requireAdmin, DashboardController.getDashboardData);
router.get('/admin/dashboard/stats', authenticateToken, requireAdmin, DashboardController.getDetailedStats);
router.get('/admin/dashboard/realtime', authenticateToken, requireAdmin, DashboardController.getRealtimeUpdates);

// Test endpoint for advanced reports
router.get('/admin/reports/test', authenticateToken, requireAdmin, AdvancedReportController.testConnection);

// Student Management Routes
router.get('/admin/students', authenticateToken, requireAdmin, StudentController.getAllStudents);
router.get('/admin/students/search', authenticateToken, requireAdmin, StudentController.searchStudents);
router.get('/admin/students/stats', authenticateToken, requireAdmin, StudentController.getStudentStats);
router.get('/admin/students/:id', authenticateToken, requireAdmin, StudentController.getStudentById);
router.post('/admin/students', authenticateToken, requireAdmin, ValidationMiddleware.validateAddStudent, StudentController.addStudent);
router.put('/admin/students/:id', authenticateToken, requireAdmin, ValidationMiddleware.validatePartialStudent, StudentController.updateStudent);
router.delete('/admin/students/:id', authenticateToken, requireAdmin, StudentController.deleteStudent);
router.delete('/admin/students', authenticateToken, requireAdmin, StudentController.bulkDeleteStudents);
router.patch('/admin/students/:id/status', authenticateToken, requireAdmin, StudentController.updateStudentStatus);
router.post('/admin/students/:id/reset-password', authenticateToken, requireAdmin, StudentController.resetStudentPassword);

// ============= ACADEMIC STRUCTURE ROUTES (MODULARIZED) =============
// Use separate route modules for better organization
router.use('/admin/departments', departmentRoutes);
router.use('/admin/majors', majorRoutes);
router.use('/admin/classes', classRoutes);

// Backward compatibility routes (deprecated - use modular routes above)
router.get('/admin/departments', authenticateToken, requireAdmin, AcademicStructureController.getAllDepartments);
router.get('/majors', authenticateToken, requireAdmin, AcademicStructureController.getAllMajors);
router.get('/classes', authenticateToken, requireAdmin, AcademicStructureController.getAllClasses);
router.get('/admin/departments/:departmentId/majors', authenticateToken, requireAdmin, AcademicStructureController.getMajorsByDepartment);
router.get('/admin/majors/:majorId/classes', authenticateToken, requireAdmin, AcademicStructureController.getClassesByMajor);

// Schedule Management Routes
router.get('/admin/schedules', authenticateToken, requireAdmin, ScheduleController.getSchedules);
router.post('/admin/schedules', authenticateToken, requireAdmin, ScheduleController.createSchedule);
router.put('/admin/schedules/:id', authenticateToken, requireAdmin, ScheduleController.updateSchedule);
router.delete('/admin/schedules/:id', authenticateToken, requireAdmin, ScheduleController.deleteSchedule);
// Xóa toàn bộ lịch hoặc theo khoa: /admin/schedules?department_id=1
router.delete('/admin/schedules', authenticateToken, requireAdmin, ScheduleController.deleteAllSchedules);

// Report Management Routes
router.get('/admin/reports/statistics', authenticateToken, requireAdmin, ReportController.getExamStatistics);
router.get('/admin/reports/detailed', authenticateToken, requireAdmin, ReportController.getDetailedReport);
router.get('/admin/reports/filter-options', authenticateToken, requireAdmin, ReportController.getFilterOptions);
router.get('/admin/reports/student-completion', authenticateToken, requireAdmin, ReportController.getStudentCompletionStats);

// ============= ADVANCED REPORTS =============
// Simple debug endpoint without authentication
router.get('/admin/reports/debug', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Advanced Reports API is working',
    timestamp: new Date(),
    routes: {
      'dashboard-overview': '/api/admin/reports/dashboard-overview',
      'organizational': '/api/admin/reports/organizational',
      'topic-analysis': '/api/admin/reports/topic-analysis',
      'real-time': '/api/admin/reports/real-time'
    }
  });
});

// Test endpoint
router.get('/admin/reports/test', authenticateToken, requireAdmin, AdvancedReportController.testConnection);

// Dashboard overview reports
router.get('/admin/reports/dashboard-overview', authenticateToken, requireAdmin, AdvancedReportController.getDashboardOverview);

// Organizational breakdown reports
router.get('/admin/reports/organizational', authenticateToken, requireAdmin, AdvancedReportController.getOrganizationalReport);

// Topic analysis reports
router.get('/admin/reports/topic-analysis', authenticateToken, requireAdmin, AdvancedReportController.getTopicAnalysisReport);

// Excel statistics reports  
router.get('/admin/reports/excel-statistics', authenticateToken, requireAdmin, AdvancedReportController.getExcelStatisticsReport);

// Major detail reports
router.get('/admin/reports/major-detail', authenticateToken, requireAdmin, AdvancedReportController.getMajorDetailReport);

// Export student lists
router.get('/admin/reports/export-students', authenticateToken, requireAdmin, AdvancedReportController.exportStudentList);

// Student detail reports
router.get('/admin/reports/student-detail', authenticateToken, requireAdmin, AdvancedReportController.getStudentDetailReport);

// Export reports
router.get('/admin/reports/export', authenticateToken, requireAdmin, AdvancedReportController.exportReport);

// ============= STUDENT ROUTES =============
// Chỉ student mới có thể truy cập
router.get('/user/progress', authenticateToken, UserProgressController.getUserProgress);
router.get('/exams/student/history', authenticateToken, StudentSubjectsController.getExamHistory);
// Modify to allow both STUDENT and ADMIN access to this endpoint for debugging
router.get('/student/subjects', authenticateToken, requireAuth, StudentSubjectsController.getStudentSubjects);

// Student profile & account
router.get('/student/me', authenticateToken, requireStudent, StudentAccountController.getMyProfile);
router.post('/student/change-password', authenticateToken, requireStudent, StudentAccountController.changePassword);

// Các routes mới cho xử lý bài thi - wrap với asyncHandler để xử lý lỗi
router.get('/topics/:topicId/exam-questions', authenticateToken, requireStudent, asyncHandler(StudentSubjectsController.getExamQuestions));
router.get('/topics/:topicId/can-take', authenticateToken, requireStudent, asyncHandler(StudentSubjectsController.canTakeQuiz));
router.get('/topics/:topicId/exam-result', authenticateToken, requireStudent, asyncHandler(StudentSubjectsController.getExamResult));
router.post('/exams/:examId/submit', authenticateToken, requireStudent, asyncHandler(StudentSubjectsController.submitExam));
// Thêm route dự phòng cho trường hợp gửi không có examId
router.post('/exams/submit', authenticateToken, requireStudent, asyncHandler(StudentSubjectsController.submitExam));
// Removed autosave route - using localStorage instead

// ============= COMMON ROUTES =============
// Cả admin và student đều có thể truy cập

module.exports = router;