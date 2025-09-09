import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Student Pages
import SubjectsPage from '../pages/student/SubjectsPage';
import QuizPage from '../pages/student/QuizPage';
import SubjectResultPage from '../pages/student/SubjectResultPage';
import HistoryPage from '../pages/student/HistoryPage';
import ProfilePage from '../pages/student/ProfilePage';

const StudentRoutes = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang kiểm tra phiên...</div>;
  }

  if (!isAuthenticated || user?.type !== 'student') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="subjects" element={<SubjectsPage />} />
      <Route path="quiz/:subjectId" element={<QuizPage />} />
      <Route path="result/:subjectId" element={<SubjectResultPage />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/student/subjects" />} />
    </Routes>
  );
};

export default StudentRoutes;