import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Admin Pages
import TopicManagementPage from '../pages/admin/TopicManagementPage';
import StudentManagementPage from '../pages/admin/StudentManagementPage';
import ReportAnalyticsPage from '../pages/admin/ReportAnalyticsPage';

const AdminRoutes = () => {
  const { user, isAuthenticated, loading } = useAuth();

  // Tránh redirect sớm khi còn đang kiểm tra cookie
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang kiểm tra phiên...</div>;
  }

  if (!isAuthenticated || user?.type !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="subjects" element={<TopicManagementPage />} />
      <Route path="students" element={<StudentManagementPage />} />
      <Route path="reports" element={<ReportAnalyticsPage />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
};

export default AdminRoutes;