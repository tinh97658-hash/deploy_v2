import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, saveQuizResult } from '../../services/apiService';
import { useExamAutosave } from '../../hooks/useExamAutosave';
import styles from './ExamExecutionPage.module.css';

const QuizPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [subject, setSubject] = useState(null);
  // Câu hỏi hiện tại (giữ để highlight trong navigation)
  const [currentQuestion, setCurrentQuestion] = useState(0);
  // Phân trang: 10 câu mỗi trang
  const QUESTIONS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const questionListRef = useRef(null);
  const [examId, setExamId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const headerTimerRef = useRef(null);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);

  // Initialize autosave hook - only when examId is available
  const {
    answers,
    updateAnswer,
    forceSave,
    clearSavedData, // dùng để xóa dữ liệu khi đã nộp bài
    isSaving,
    lastSaved,
    hasUnsavedChanges
  } = useExamAutosave(examId || null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch exam questions using our updated API
        const quizData = await getQuiz(subjectId);

        // Debug logging
        console.log(`Loaded exam for subject ${subjectId}`);
        console.log('Quiz data:', quizData);
        console.log('Questions with savedAnswers:', quizData.questions?.map(q => ({
          id: q.id,
          savedAnswers: q.savedAnswers,
          answerMapping: q.answerMapping
        })));
        
        if (!quizData || !quizData.questions) {
          setError(`Không thể tải câu hỏi cho chuyên đề này.`);
          setLoading(false);
          return;
        }
        
        console.log(`Questions count: ${quizData.questions?.length || 0}`);

        // Set quiz data and examId
        setQuiz(quizData);
        setExamId(quizData.examId); // Set examId for autosave hook
        
        // Load saved answers if any
        const savedAnswers = {};
        if (quizData.questions) {
          console.log('Processing saved answers for questions:', quizData.questions.length);
          quizData.questions.forEach(question => {
            console.log(`Question ${question.id} savedAnswers:`, question.savedAnswers);
            if (question.savedAnswers && question.savedAnswers.length > 0) {
              // Convert A,B,C,D back to actual answer IDs for the autosave hook
              const actualAnswerIds = question.savedAnswers.map(letter => {
                const actualId = question.answerMapping[letter];
                console.log(`Converting ${letter} to ${actualId}`);
                return actualId;
              }).filter(id => id);
              
              if (actualAnswerIds.length > 0) {
                savedAnswers[question.id] = actualAnswerIds;
                console.log(`Set savedAnswers for question ${question.id}:`, actualAnswerIds);
              }
            }
          });
        }
        
        console.log('Final saved answers to load:', savedAnswers);
        
        // Initialize autosave hook with saved answers
        if (Object.keys(savedAnswers).length > 0) {
          // Update answers in the hook
          Object.keys(savedAnswers).forEach(questionId => {
            updateAnswer(questionId, savedAnswers[questionId]);
          });
        }
        
        // Chuẩn hóa dữ liệu subject: một số endpoint trả về timeLimit, số khác trả về duration_minutes
        const rawSubject = quizData.topic || {};
        const normalizedTimeLimit = [
          rawSubject.timeLimit,
          rawSubject.duration_minutes,
          rawSubject.durationMinutes,
          quizData.duration_minutes,
          quizData.timeLimit
        ].find(v => typeof v === 'number' && !isNaN(v) && v > 0);

        const normalizedPassScore = [
          rawSubject.passScore,
          rawSubject.pass_score,
          quizData.pass_score,
          quizData.passScore
        ].find(v => typeof v === 'number' && !isNaN(v) && v >= 0);

        const subjectData = {
          ...rawSubject,
            // Ghi đè để giao diện dùng thống nhất
          timeLimit: normalizedTimeLimit || 0,
          passScore: normalizedPassScore ?? rawSubject.passScore ?? rawSubject.pass_score
        };
        setSubject(subjectData);

        if (subjectData.timeLimit > 0) {
          setTimeLeft(subjectData.timeLimit * 60);
        } else {
          console.warn('Không tìm thấy trường thời gian hợp lệ (timeLimit/duration_minutes). Đặt 0.');
          setTimeLeft(0);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error in QuizPage:', err);
        setError('Không thể tải bài thi. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId, updateAnswer]);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isSubmitted]);

  // Show floating timer only when header timer is out of view (mobile UX)
  useEffect(() => {
    const el = headerTimerRef.current;
    if (!el) return;

    // Helper fallback using absolute page scroll vs. header timer position
    const computeVisibility = () => {
      const rect = el.getBoundingClientRect();
      const headerTimerBottomFromPage = rect.bottom + window.scrollY; // bottom position relative to document
      const scrolledPastHeaderTimer = window.scrollY > headerTimerBottomFromPage; // out of view above
      // Also treat as scrolled past if header top is above viewport top
      const scrolled = rect.top < 0;
      setShowFloatingTimer(scrolledPastHeaderTimer || scrolled);
    };

    let observerCleanup = null;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        // If not intersecting at all, show floating timer
        setShowFloatingTimer(!entry.isIntersecting);
      }, { root: null, threshold: 0.01 });
      observer.observe(el);
      observerCleanup = () => observer.disconnect();
    }

    window.addEventListener('scroll', computeVisibility, { passive: true });
    window.addEventListener('resize', computeVisibility);
    // Kick once after mount to set initial state
    setTimeout(computeVisibility, 0);

    return () => {
      if (observerCleanup) observerCleanup();
      window.removeEventListener('scroll', computeVisibility);
      window.removeEventListener('resize', computeVisibility);
    };
  }, [loading, isSubmitted]);

  const handleAnswerChange = (questionId, optionId, isMultiple = false) => {
    console.log('handleAnswerChange called:', { questionId, optionId, isMultiple, examId });
    
    if (isMultiple) {
      const currentAnswers = answers[questionId] || [];
      const newAnswers = currentAnswers.includes(optionId)
        ? currentAnswers.filter(id => id !== optionId)
        : [...currentAnswers, optionId];
      console.log('Multiple choice update:', { questionId, currentAnswers, newAnswers });
      updateAnswer(questionId, newAnswers);
    } else {
      console.log('Single choice update:', { questionId, optionId });
      updateAnswer(questionId, [optionId]);
    }
  };

  // Removed unused calculateScore helper (server returns score)

  // Handle back to subjects with autosave
  const handleBackToSubjects = async () => {
    try {
      // Force save current answers before leaving
      setLoading(true); // Show loading state
      await forceSave();
      console.log('Autosaved before leaving exam page');
      
      // Navigate back to subjects page
      navigate('/student/subjects');
    } catch (error) {
      console.error('Error saving before leaving:', error);
      setLoading(false);
      
      // Navigate anyway, but warn user
      const confirmLeave = window.confirm(
        'Không thể lưu trạng thái hiện tại. Bạn có chắc muốn quay lại không? Tiến trình có thể bị mất.'
      );
      if (confirmLeave) {
        navigate('/student/subjects');
      }
    }
  };

  // Improved handleSubmit to work with our new API
  const handleSubmit = async () => {
    if (!quiz || !quiz.questions || !quiz.questions.length || !subject) {
      console.log('Cannot submit quiz - missing data');
      return;
    }
    
    try {
      // Show loading state
      setLoading(true);
      
      console.log('Submitting answers:', answers);
      console.log('Exam ID:', quiz.examId);
      
  // Save result using the updated saveQuizResult function
  const result = await saveQuizResult(quiz.examId, { ...answers, topicId: subjectId });
      
      console.log('Exam submission successful:', result);
      
  // Lưu trạng thái hoàn thành vào localStorage
      const userProgress = JSON.parse(localStorage.getItem('userProgress')) || {};
      userProgress[subjectId] = { 
        passed: result.passed,
        score: result.score,
        completedAt: new Date().toISOString()
      };
      localStorage.setItem('userProgress', JSON.stringify(userProgress));
      
      // Update the UI with the result
      setResult({
        score: result.score,
        passed: result.passed,
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        passScore: result.passScore || subject.passScore
      });
      // Xóa toàn bộ câu trả lời đã lưu (localStorage + state) để lần làm sau không hiển thị
      try {
        clearSavedData && clearSavedData();
        // Ngăn autosave chạy lại sau khi xóa local bằng cách vô hiệu hóa examId
        setExamId(null);
      } catch(e) {
        console.warn('Clear saved data error:', e);
      }
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error saving quiz result:', error);
      alert('Có lỗi xảy ra khi lưu kết quả. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (index) => {
    const q = quiz.questions[index];
    if (!q) return 'unanswered';
    const hasAnswer = answers[q.id] && answers[q.id].length > 0;
    if (index === currentQuestion) return 'current';
    if (hasAnswer) return 'answered';
    return 'unanswered';
  };

  const totalQuestions = quiz?.questions?.length || 0;
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
  const pageStartIndex = currentPage * QUESTIONS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + QUESTIONS_PER_PAGE, totalQuestions);
  const displayedQuestions = quiz?.questions?.slice(pageStartIndex, pageEndIndex) || [];

  const goToPage = (page, focusQuestionIndex = null) => {
    const safe = Math.max(0, Math.min(totalPages - 1, page));
    setCurrentPage(safe);
    const defaultFirstIndex = safe * QUESTIONS_PER_PAGE;
    const targetQuestionIndex = focusQuestionIndex != null ? focusQuestionIndex : defaultFirstIndex;
    setCurrentQuestion(targetQuestionIndex);
    setTimeout(() => {
      if (focusQuestionIndex != null) {
        const q = quiz.questions[focusQuestionIndex];
        if (q) {
          const el = document.getElementById(`question-block-${q.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
      }
      // fallback scroll top panel
      questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };

  const handleQuestionNavClick = (index) => {
    const targetPage = Math.floor(index / QUESTIONS_PER_PAGE);
    if (targetPage !== currentPage) {
      goToPage(targetPage, index);
    } else {
      setCurrentQuestion(index);
      const q = quiz.questions[index];
      if (q) {
        const el = document.getElementById(`question-block-${q.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Đang tải bài thi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={() => navigate('/student/subjects')}>Quay lại</button>
        </div>
      </div>
    );
  }

  if (!quiz || !quiz.questions) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>Không tìm thấy bài thi.</p>
          <button onClick={() => navigate('/student/subjects')}>Quay lại</button>
        </div>
      </div>
    );
  }

  if (!loading && quiz && Array.isArray(quiz.questions) && quiz.questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="fas fa-info-circle"></i>
            <p>Chuyên đề này hiện chưa có câu hỏi. Vui lòng quay lại sau.</p>
          <button onClick={() => navigate('/student/subjects')}>Quay lại</button>
        </div>
      </div>
    );
  }

  if (isSubmitted && result) {
    return (
      <div className={styles.container}>
        <div className={styles.resultContainer}>
          <div className={styles.resultCard}>
            <div className={`${styles.resultIcon} ${result.passed ? styles.passed : styles.failed}`}>
              <i className={result.passed ? 'fas fa-check-circle' : 'fas fa-times-circle'}></i>
            </div>
            
            <h2 className={styles.resultTitle}>
              {result.passed ? 'Chúc mừng! Bạn đã vượt qua bài thi' : 'Bạn chưa đạt điểm qua môn'}
            </h2>
            
            <div className={styles.scoreDisplay}>
              <div className={styles.mainScore}>{result.score}%</div>
              <div className={styles.scoreDetails}>
                {result.correctAnswers}/{result.totalQuestions} câu đúng
              </div>
            </div>
            
            <div className={styles.resultStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Điểm của bạn:</span>
                <span className={styles.statValue}>{result.score}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Điểm qua môn:</span>
                <span className={styles.statValue}>{result.passScore}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Kết quả:</span>
                <span className={`${styles.statValue} ${result.passed ? styles.passText : styles.failText}`}>
                  {result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </span>
              </div>
            </div>
            
            <div className={styles.resultActions}>
              {/* Always show the Back button regardless of result */}
              <button 
                className={styles.backBtn}
                onClick={() => navigate('/student/subjects')}
              >
                Quay lại danh sách môn học
              </button>
              
              {/* Only show retry button for students who failed */}
              {!result.passed && (
                <button 
                  className={styles.retryBtn}
                  onClick={() => window.location.reload()}
                >
                  Làm lại bài thi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Kiểm tra dữ liệu trước khi truy cập questions
  if (!quiz || !quiz.questions) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Đang tải bài thi...</p>
        </div>
      </div>
    );
  }

  // Removed unused currentQ variable (was creating lint warning)

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.subjectInfo}>
            <h1>{subject.name}</h1>
            <p>{subject.description}</p>
            <div className={styles.examMeta}>
              <span><i className="fas fa-clock"></i> Thời gian làm bài: {subject?.timeLimit && subject.timeLimit > 0 ? subject.timeLimit : '--'} phút</span>
              <span><i className="fas fa-target"></i> Điểm qua môn: {subject?.passScore ?? '--'}%</span>
              <span><i className="fas fa-question-circle"></i> Số câu hỏi: {quiz?.questions?.length || 0}</span>
            </div>
          </div>
          <div className={styles.timerSection}>
            <div className={styles.timer} ref={headerTimerRef}>
              <i className="fas fa-clock"></i>
              <span className={timeLeft <= 300 ? styles.timeWarning : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
            {/* Autosave indicator */}
            <div className={styles.autosaveStatus}>
              {isSaving && (
                <span className={styles.saving}>
                  <i className="fas fa-spinner fa-spin"></i> Đang lưu...
                </span>
              )}
              {hasUnsavedChanges && !isSaving && (
                <span className={styles.unsaved}>
                  <i className="fas fa-exclamation-circle"></i> Có thay đổi chưa lưu
                </span>
              )}
              {!hasUnsavedChanges && !isSaving && lastSaved && (
                <span className={styles.saved}>
                  <i className="fas fa-check-circle"></i> Đã lưu lúc {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.quizContent}>
        {/* Navigation */}
        <div className={styles.questionNav}>
          <h3>Câu hỏi</h3>
          <div className={styles.questionGrid}>
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                className={`${styles.questionNavBtn} ${styles[getQuestionStatus(index)]}`}
                onClick={() => handleQuestionNavClick(index)}
                title={`Câu ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.current}`}></div><span>Hiện tại</span></div>
            <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.answered}`}></div><span>Đã trả lời</span></div>
            <div className={styles.legendItem}><div className={`${styles.legendColor} ${styles.unanswered}`}></div><span>Chưa trả lời</span></div>
          </div>
          <div className={styles.pageInfo}>
            Trang {currentPage + 1} / {totalPages}
          </div>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <i className="fas fa-chevron-left" /> Trước
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
            >
              Sau <i className="fas fa-chevron-right" />
            </button>
          </div>
          <div className={styles.submitSection}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading || error || isSubmitted}
            >
              Nộp bài <i className="fas fa-paper-plane" />
            </button>
            <button
              className={styles.backBtnSmall}
              onClick={handleBackToSubjects}
              disabled={loading}
            >
              <i className="fas fa-arrow-left" /> Quay lại
            </button>
            <div className={styles.autosaveHint}><i className="fas fa-save" /> Tự động lưu 30s</div>
          </div>
        </div>
        {/* Multi-question page */}
        <div className={styles.multiQuestionPanel} ref={questionListRef}>
          {displayedQuestions.map((q, idx) => {
            const globalIndex = pageStartIndex + idx;
            const isMultiple = (q.type === 'multiple' || q.type === 'multiple_choice' || q.is_multiple_choice);
            return (
              <div key={q.id} id={`question-block-${q.id}`} className={styles.questionBlock}>
                <div className={styles.questionBlockHeader}>
                  <span className={styles.questionBlockNumber}>Câu {globalIndex + 1}</span>
                  {answers[q.id]?.length > 0 && <span className={styles.answeredTag}>Đã trả lời</span>}
                </div>
                <div className={styles.questionBlockText}>{q.question}</div>
                <div className={styles.options}>
                  {q.options.map(option => (
                    <label key={option.id} className={styles.optionLabel}>
                      <input
                        type={isMultiple ? 'checkbox' : 'radio'}
                        name={`question-${q.id}`}
                        value={option.id}
                        checked={answers[q.id]?.includes(option.id) || false}
                        onChange={() => handleAnswerChange(q.id, option.id, isMultiple)}
                      />
                      <span className={styles.optionText}>{option.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {/* Bottom pagination controls (duplicate for convenience) */}
          <div className={styles.bottomPagination}>
            <button
              className={styles.pageBtn}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <i className="fas fa-chevron-left" /> Trang trước
            </button>
            <div className={styles.pageIndicator}>Trang {currentPage + 1} / {totalPages}</div>
            {currentPage < totalPages - 1 ? (
              <button
                className={styles.pageBtn}
                onClick={() => goToPage(currentPage + 1)}
              >
                Trang tiếp <i className="fas fa-chevron-right" />
              </button>
            ) : (
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={loading || error || isSubmitted}
              >
                Nộp bài <i className="fas fa-paper-plane" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile floating timer (always visible while scrolling) */}
      {timeLeft > 0 && !isSubmitted && showFloatingTimer && (
        <div className={`${styles.floatingTimer} ${timeLeft <= 300 ? styles.timeWarning : ''}`} aria-live="polite">
          <i className="fas fa-clock" /> {formatTime(timeLeft)}
        </div>
      )}
    </div>
  );
};

export default QuizPage;