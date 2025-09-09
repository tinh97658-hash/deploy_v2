import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import './assets/styles/App.css'; 

// Student Pages
import AuthenticationPage from './pages/AuthenticationPage';
import TopicListPage from './pages/student/TopicListPage';
import ExamExecutionPage from './pages/student/ExamExecutionPage'; 
import StudentProfilePage from './pages/student/StudentProfilePage';
import ExamHistoryPage from './pages/student/ExamHistoryPage';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import TopicManagementPage from './pages/admin/TopicManagementPage';
import StudentManagementPage from './pages/admin/StudentManagementPage';
import DepartmentManagementPage from './pages/admin/DepartmentManagementPage';
import MajorManagementPage from './pages/admin/MajorManagementPage';
import ClassManagementPage from './pages/admin/ClassManagementPage';
import ReportAnalyticsPage from './pages/admin/ReportAnalyticsPage';
import AdvancedReportsPage from './pages/admin/AdvancedReportsPage';
import TestReportsPage from './pages/admin/TestReportsPage';
import SchedulesManagementPage from './pages/admin/SchedulesManagementPage';

// Layouts
import AdminLayout from './layouts/AdminLayout';

// Other Pages
import NotFoundPage from './pages/NotFoundPage';

function App() {
  // Using destructured values to avoid ESLint warnings
  const { loading, isAuthenticated, user } = useAuth();

  // Show a loading screen while authentication status is being determined
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Đang tải...</span>
        </div>
        <p style={{ marginTop: '20px', fontSize: '18px', color: '#555' }}>Đang tải dữ liệu, vui lòng đợi...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={
          isAuthenticated ? (
            user?.type === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/student/subjects" />
          ) : (
            <AuthenticationPage />
          )
        } />
        
        {/* Redirect old login routes */}
        <Route path="/student/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        
        {/* Protected Student Routes */}
        <Route path="/student/subjects" element={
          <ProtectedRoute requiredRole="student">
            <TopicListPage />
          </ProtectedRoute>
        } />
        
        <Route path="/student/quiz/:subjectId" element={
          <ProtectedRoute requiredRole="student">
            <ExamExecutionPage />
          </ProtectedRoute>
        } />
        
        <Route path="/student/result/:subjectId" element={
          <ProtectedRoute requiredRole="student">
          </ProtectedRoute>
        } />
        
        <Route path="/student/profile" element={
          <ProtectedRoute requiredRole="student">
            <StudentProfilePage />
          </ProtectedRoute>
        } />
        
        <Route path="/student/history" element={
          <ProtectedRoute requiredRole="student">
            <ExamHistoryPage />
          </ProtectedRoute>
        } />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/subjects" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <TopicManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/students" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <StudentManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Separated academic structure routes */}
        <Route path="/admin/departments" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <DepartmentManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/majors" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <MajorManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/classes" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <ClassManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/reports" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <ReportAnalyticsPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/advanced-reports" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <AdvancedReportsPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/test-reports" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <TestReportsPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/schedules" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <SchedulesManagementPage />
            </AdminLayout>
          </ProtectedRoute>
        } />
            
        {/* Fallback for any other path */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;