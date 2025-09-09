import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamAutosave } from '../../hooks/useExamAutosave';
import ExamRecovery from '../../components/exam/ExamRecovery';
import ExamLocalStorageService from '../../services/examLocalStorageService';
import { getQuiz, saveQuizResult } from '../../services/apiService';

const ExamExecutionPageEnhanced = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  
  // Basic exam state
  const [quiz, setQuiz] = useState(null);
  const [subject, setSubject] = useState(null);
  const [examId, setExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  
  // Exam metadata for localStorage
  const examMetadata = {
    subjectId,
    subjectName: subject?.name || 'Unknown Subject',
    totalQuestions: quiz?.questions?.length || 0,
    timeLimit: quiz?.duration_minutes || 0
  };

  // Enhanced autosave hook với localStorage
  const {
    answers,
    updateAnswer,
    forceSave,
    clearSavedData,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    timeSpent,
    setTimeSpent,
    currentQuestion,
    setCurrentQuestion,
    currentPage,
    setCurrentPage,
    isOffline,
    updateNavigation,
    getRecoveryData,
    restoreFromSaved
  } = useExamAutosave(examId, {}, examMetadata);

  // Load exam data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const quizData = await getQuiz(subjectId);
        console.log('Quiz data loaded:', quizData);
        
        setQuiz(quizData.quiz);
        setSubject(quizData.subject);
        setExamId(quizData.examId);
        
        // Check for recovery data sau khi có examId
        if (quizData.examId) {
          const recoveryData = ExamLocalStorageService.getExamProgress(quizData.examId);
          if (recoveryData && Object.keys(recoveryData.answers || {}).length > 0) {
            console.log('Found recovery data, showing recovery modal');
            setShowRecovery(true);
          }
        }
        
      } catch (error) {
        console.error('Error loading exam:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [subjectId]);

  // Handle exam recovery
  const handleRestoreExam = (progressData) => {
    console.log('Restoring exam from saved progress:', progressData);
    restoreFromSaved(progressData);
    setShowRecovery(false);
  };

  const handleDiscardProgress = (examId) => {
    console.log('Discarding progress for exam:', examId);
    ExamLocalStorageService.clearExamProgress(examId);
    setShowRecovery(false);
  };

  // Handle answer selection - chỉ lưu khi có thay đổi
  const handleAnswerSelect = (questionId, selectedOptions) => {
    // Check if this is actually a change
    const currentAnswer = answers[questionId];
    const isActualChange = JSON.stringify(currentAnswer) !== JSON.stringify(selectedOptions);
    
    if (isActualChange) {
      console.log(`Answer changed for question ${questionId}:`, selectedOptions);
      updateAnswer(questionId, selectedOptions);
      
      // Visual feedback cho user
      showTemporaryMessage('Đáp án đã được cập nhật');
    } else {
      console.log(`No change for question ${questionId}, skipping autosave`);
    }
  };

  // Handle question navigation với option save trước khi chuyển
  const handleQuestionNavigation = (questionIndex, pageIndex = null, saveBeforeNavigate = false) => {
    // Nếu có unsaved changes và user muốn save trước khi chuyển câu
    if (saveBeforeNavigate && hasUnsavedChanges) {
      console.log('Saving before navigation...');
      forceSave().then(() => {
        updateNavigation(questionIndex, pageIndex);
        scrollToQuestion(questionIndex);
      });
    } else {
      updateNavigation(questionIndex, pageIndex);
      scrollToQuestion(questionIndex);
    }
  };
  
  // Helper function để scroll tới câu hỏi
  const scrollToQuestion = (questionIndex) => {
    const questionElement = document.getElementById(`question-${questionIndex}`);
    if (questionElement) {
      questionElement.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Helper function để hiển thị message tạm thời
  const showTemporaryMessage = (message) => {
    // Implement toast notification hoặc temporary message
    console.log('Notification:', message);
  };

  // Handle exam submission
  const handleSubmitExam = async () => {
    try {
      setLoading(true);
      
      // Force save trước khi submit
      await forceSave();
      
      // Submit exam
      const result = await saveQuizResult(examId, answers);
      
  // Clear localStorage sau khi submit thành công
  clearSavedData();
  // Ngăn autosave chạy lại và tránh ghi lại localStorage
  setExamId(null);
      
      // Update user stats
      ExamLocalStorageService.saveUserStats({
        totalExams: (ExamLocalStorageService.getUserStats()?.totalExams || 0) + 1,
        totalTimeSpent: (ExamLocalStorageService.getUserStats()?.totalTimeSpent || 0) + timeSpent,
        lastExamDate: new Date().toISOString(),
        examHistory: [
          ...(ExamLocalStorageService.getUserStats()?.examHistory || []),
          {
            examId,
            subjectId,
            subjectName: subject?.name,
            score: result.score,
            timeSpent,
            completedAt: new Date().toISOString()
          }
        ]
      });
      
      setIsSubmitted(true);
      console.log('Exam submitted successfully:', result);
      
      // Navigate to results
      navigate(`/student/exam-result/${examId}`);
      
    } catch (error) {
      console.error('Error submitting exam:', error);
      setError('Lỗi khi nộp bài: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when time runs out
  useEffect(() => {
    const timeLimit = quiz?.duration_minutes * 60; // Convert to seconds
    if (timeLimit && timeSpent >= timeLimit && !isSubmitted) {
      console.log('Time limit reached, auto-submitting exam');
      handleSubmitExam();
    }
  }, [timeSpent, quiz?.duration_minutes, isSubmitted]);

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading && !quiz) {
    return (
      <div className="exam-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải bài thi...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="exam-error">
        <h3>Có lỗi xảy ra</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/student/subjects')}>
          Quay lại danh sách môn học
        </button>
      </div>
    );
  }

  return (
    <div className="exam-execution-page">
      {/* Recovery Modal */}
      {showRecovery && (
        <ExamRecovery
          examId={examId}
          onRestore={handleRestoreExam}
          onDiscard={handleDiscardProgress}
          onCancel={() => setShowRecovery(false)}
        />
      )}

      {/* Exam Header */}
      <div className="exam-header">
        <div className="exam-info">
          <h1>{subject?.name}</h1>
          <p>{quiz?.description}</p>
        </div>
        
        <div className="exam-status">
          {/* Connection Status */}
          {isOffline && (
            <div className="status-item offline">
              <span className="icon">📡</span>
              <span>Chế độ offline</span>
            </div>
          )}
          
          {/* Save Status */}
          {isSaving && (
            <div className="status-item saving">
              <span className="icon spinning">⚙️</span>
              <span>Đang lưu...</span>
            </div>
          )}
          
          {hasUnsavedChanges && (
            <div className="status-item unsaved">
              <span className="icon">⚠️</span>
              <span>Có thay đổi chưa lưu</span>
            </div>
          )}
          
          {lastSaved && (
            <div className="status-item saved">
              <span className="icon">✅</span>
              <span>Đã lưu lúc {new Date(lastSaved).toLocaleTimeString()}</span>
            </div>
          )}
          
          {/* Time */}
          <div className="status-item time">
            <span className="icon">⏱️</span>
            <span>{formatTime(timeSpent)}</span>
          </div>
          
          {/* Progress */}
          <div className="status-item progress">
            <span className="icon">📊</span>
            <span>{Object.keys(answers).length} / {quiz?.questions?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="question-navigation">
        {quiz?.questions?.map((question, index) => (
          <button
            key={question.id}
            className={`nav-button ${
              index === currentQuestion ? 'current' : ''
            } ${
              answers[question.id] ? 'answered' : 'unanswered'
            }`}
            onClick={() => handleQuestionNavigation(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="questions-container">
        {quiz?.questions?.map((question, index) => (
          <div
            key={question.id}
            id={`question-${index}`}
            className={`question-item ${
              index === currentQuestion ? 'current' : ''
            }`}
          >
            <div className="question-header">
              <h3>Câu {index + 1}</h3>
            </div>
            
            <div className="question-content">
              <p>{question.content}</p>
            </div>
            
            <div className="question-answers">
              {question.answers?.map((answer) => (
                <label key={answer.id} className="answer-option">
                  <input
                    type={question.is_multiple_choice ? 'checkbox' : 'radio'}
                    name={`question-${question.id}`}
                    value={answer.id}
                    checked={
                      Array.isArray(answers[question.id])
                        ? answers[question.id].includes(answer.id)
                        : answers[question.id] === answer.id
                    }
                    onChange={(e) => {
                      let selectedOptions;
                      if (question.is_multiple_choice) {
                        const current = answers[question.id] || [];
                        if (e.target.checked) {
                          selectedOptions = [...current, answer.id];
                        } else {
                          selectedOptions = current.filter(id => id !== answer.id);
                        }
                      } else {
                        selectedOptions = answer.id;
                      }
                      handleAnswerSelect(question.id, selectedOptions);
                    }}
                  />
                  <span>{answer.content}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Exam Footer */}
      <div className="exam-footer">
        <button
          className="btn-save"
          onClick={forceSave}
          disabled={isSaving || !hasUnsavedChanges}
        >
          {isSaving ? 'Đang lưu...' : 'Lưu ngay'}
        </button>
        
        <button
          className="btn-submit"
          onClick={handleSubmitExam}
          disabled={loading}
        >
          {loading ? 'Đang nộp...' : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
};

export default ExamExecutionPageEnhanced;
