import React, { useState, useEffect } from 'react';
import ExamLocalStorageService from '../../services/examLocalStorageService';
import './ExamRecovery.css';

/**
 * Component để phục hồi các bài làm chưa hoàn thành
 * Hiển thị khi user vào trang làm bài và có dữ liệu cũ trong localStorage
 */
const ExamRecovery = ({ examId, onRestore, onDiscard, onCancel }) => {
  const [unfinishedExams, setUnfinishedExams] = useState([]);
  const [currentExamProgress, setCurrentExamProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadUnfinishedExams = () => {
      try {
        setLoading(true);
        
        // Nếu có examId cụ thể, chỉ load progress của exam đó
        if (examId) {
          const progress = ExamLocalStorageService.getExamProgress(examId);
          if (progress && Object.keys(progress.answers || {}).length > 0) {
            setCurrentExamProgress(progress);
          }
        } else {
          // Load tất cả exam chưa hoàn thành
          const exams = ExamLocalStorageService.getUnfinishedExams();
          setUnfinishedExams(exams);
        }
      } catch (error) {
        console.error('Error loading unfinished exams:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUnfinishedExams();
  }, [examId]);
  
  // Không hiển thị nếu không có data cần recover
  if (loading) {
    return (
      <div className="exam-recovery-loading">
        <div className="loading-spinner"></div>
        <p>Đang kiểm tra tiến trình làm bài...</p>
      </div>
    );
  }
  
  if (!currentExamProgress && unfinishedExams.length === 0) {
    return null;
  }
  
  const handleRestore = (targetExamId) => {
    const progress = ExamLocalStorageService.getExamProgress(targetExamId);
    if (progress && onRestore) {
      onRestore(progress);
    }
  };
  
  const handleDiscard = (targetExamId) => {
    ExamLocalStorageService.clearExamProgress(targetExamId);
    
    if (examId === targetExamId) {
      setCurrentExamProgress(null);
    } else {
      setUnfinishedExams(prev => prev.filter(exam => exam.examId !== targetExamId));
    }
    
    if (onDiscard) {
      onDiscard(targetExamId);
    }
  };
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };
  
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };
  
  // Recovery cho exam hiện tại
  if (currentExamProgress) {
    const progress = currentExamProgress;
    const completedPercent = progress.totalQuestions > 0 
      ? Math.round((Object.keys(progress.answers || {}).length / progress.totalQuestions) * 100)
      : 0;
    
    return (
      <div className="exam-recovery-modal active">
        <div className="exam-recovery-backdrop" onClick={onCancel}></div>
        <div className="exam-recovery-content">
          <div className="recovery-header">
            <h3>🔄 Phục hồi bài làm</h3>
            <p>Chúng tôi tìm thấy tiến trình làm bài trước đó chưa hoàn thành.</p>
          </div>
          
          <div className="recovery-item current-exam">
            <div className="exam-info">
              <h4>{progress.subjectName || 'Bài thi'}</h4>
              <div className="exam-stats">
                <div className="stat">
                  <span className="stat-label">Tiến độ:</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${completedPercent}%` }}
                    ></div>
                  </div>
                  <span className="stat-value">{completedPercent}%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Đã làm:</span>
                  <span className="stat-value">
                    {Object.keys(progress.answers || {}).length} / {progress.totalQuestions} câu
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Thời gian đã dùng:</span>
                  <span className="stat-value">{formatTime(progress.timeSpent)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Lần cuối:</span>
                  <span className="stat-value">{formatDateTime(progress.lastActivity)}</span>
                </div>
              </div>
            </div>
            
            <div className="recovery-actions">
              <button 
                className="btn-restore" 
                onClick={() => handleRestore(progress.examId)}
              >
                ✅ Tiếp tục làm bài
              </button>
              <button 
                className="btn-discard" 
                onClick={() => handleDiscard(progress.examId)}
              >
                🗑️ Xóa và làm lại
              </button>
              <button 
                className="btn-cancel" 
                onClick={onCancel}
              >
                ❌ Hủy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Recovery cho tất cả exam chưa hoàn thành
  return (
    <div className="exam-recovery-modal active">
      <div className="exam-recovery-backdrop" onClick={onCancel}></div>
      <div className="exam-recovery-content">
        <div className="recovery-header">
          <h3>🔄 Các bài làm chưa hoàn thành</h3>
          <p>Chúng tôi tìm thấy {unfinishedExams.length} bài làm chưa hoàn thành:</p>
        </div>
        
        <div className="recovery-list">
          {unfinishedExams.map(exam => (
            <div key={exam.examId} className="recovery-item">
              <div className="exam-info">
                <h4>{exam.subjectName}</h4>
                <div className="exam-stats">
                  <div className="stat">
                    <span className="stat-label">Tiến độ:</span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${exam.progress}%` }}
                      ></div>
                    </div>
                    <span className="stat-value">{exam.progress}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Đã làm:</span>
                    <span className="stat-value">
                      {exam.completedQuestions} / {exam.totalQuestions} câu
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Thời gian:</span>
                    <span className="stat-value">{formatTime(exam.timeSpent)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Lần cuối:</span>
                    <span className="stat-value">{formatDateTime(exam.lastActivity)}</span>
                  </div>
                </div>
              </div>
              
              <div className="recovery-actions">
                <button 
                  className="btn-restore" 
                  onClick={() => handleRestore(exam.examId)}
                >
                  ✅ Tiếp tục
                </button>
                <button 
                  className="btn-discard" 
                  onClick={() => handleDiscard(exam.examId)}
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="recovery-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamRecovery;
