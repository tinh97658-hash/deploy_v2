import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, getUserProgress, canTakeQuiz } from '../../services/apiService';
import styles from './TopicListPage.module.css';
import { useAuth } from '../../hooks/useAuth';
import StudentMenu from '../../components/StudentMenu';

const TopicListPage = () => {
  const { user, isAuthenticated } = useAuth();
  
  console.log('=== AUTH DEBUG ===');
  console.log('User:', user);
  console.log('Is authenticated:', isAuthenticated);
  console.log('User type:', user?.type);
  console.log('=== AUTH END ===');
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sửa userInfo: lấy từ user thực tế
  const [userInfo, setUserInfo] = useState({
    name: '',
    class: '',
    major: '',
    department: '',
    totalCompleted: 0,
    totalSubjects: 0,
    averageScore: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Log thông tin user để debug
        console.log('===== DEBUG USER INFO =====');
        console.log('User object:', user);
        console.log('User ID:', user?.id);
        console.log('Username:', user?.username);
        console.log('Role:', user?.role);
        console.log('Type:', user?.type);
        console.log('Department:', user?.department);
        console.log('Major:', user?.major);
        console.log('Class:', user?.class);
        console.log('==========================');

        const userId = user?.id || user?.username || 'guest';

        // Chỉ lấy đúng các trường class, major, department từ user
        const name = user?.name || user?.fullName || user?.username || '';
        const className = user?.class || '';
        const major = user?.major || '';
        const department = user?.department || '';

        console.log('Calling getSubjects API...');
        const subjectsResp = await getSubjects({ forceStudent: true });
        console.log('Student subjects API response (normalized):', subjectsResp);

        const subjectsData = subjectsResp.subjects || [];
        const studentInfoData = subjectsResp.studentInfo;
        const meta = subjectsResp.metadata || {};

        if (!Array.isArray(subjectsData) || subjectsData.length === 0) {
          setSubjects([]);
          setUserInfo({
            name: studentInfoData?.name || name,
            class: studentInfoData?.class || className,
            major: studentInfoData?.major || major,
            department: studentInfoData?.department || department,
            totalCompleted: 0,
            totalSubjects: 0,
            averageScore: 0,
            errorReason: meta.reason || 'no_schedule'
          });
          setLoading(false);
          return;
        }

        console.log('Calling getUserProgress API...');
        const progressData = await getUserProgress(userId).catch(err => {
          console.warn('Could not fetch user progress:', err);
          return {};
        });

        console.log('Progress data:', progressData);

        const localProgress = JSON.parse(localStorage.getItem('userProgress') || '{}');
        const combinedProgress = { ...progressData, ...(localProgress[userId] || {}) };

  console.log('Setting subjects data:', subjectsData.length, 'items');
  setSubjects(subjectsData);
        setUserProgress(combinedProgress);

        // Calculate completed subjects using both new API format and old progress data
        let completedCount = 0;
        let totalScore = 0;
        
        // Count completed subjects from the new API format
        const completedFromAPI = subjectsData.filter(subject => 
          subject.examStatus && subject.examStatus.taken && subject.examStatus.passed
        ).length;
        
        // Count completed subjects from the old progress data
        const completedFromProgress = Object.values(combinedProgress).filter(p => p.passed).length;
        
        // Use the higher value
        completedCount = Math.max(completedFromAPI, completedFromProgress);
        
        // Calculate total score from subjects with examStatus
        subjectsData.forEach(subject => {
          if (subject.examStatus && subject.examStatus.taken && subject.examStatus.score !== null && subject.examStatus.score !== undefined) {
            totalScore += Number(subject.examStatus.score) || 0;
          }
        });
        
        // Add scores from progress data if not already counted
        Object.values(combinedProgress).forEach(p => {
          if (p.bestScore !== null && p.bestScore !== undefined) {
            // Check if we've already counted this subject
            const alreadyCounted = subjectsData.some(subject => 
              subject.id === p.topicId && subject.examStatus && subject.examStatus.taken
            );
            
            if (!alreadyCounted) {
              totalScore += Number(p.bestScore) || 0;
            }
          }
        });
        
        // Ensure averageScore is never NaN
        const averageScore = (completedCount > 0 && totalScore > 0) ? Math.round(totalScore / completedCount) : 0;

        // Cập nhật userInfo từ dữ liệu thực tế hoặc từ API response nếu có
        if (studentInfoData) {
          // Sử dụng thông tin sinh viên từ API
          setUserInfo({
            name: studentInfoData.name || name,
            class: studentInfoData.class || className,
            major: studentInfoData.major || major,
            department: studentInfoData.department || department,
            totalCompleted: completedCount,
            totalSubjects: subjectsData.length,
            averageScore
          });
        } else {
          // Sử dụng thông tin từ user trong localStorage nếu không có trong API response
          setUserInfo({
            name,
            class: className,
            major,
            department,
            totalCompleted: completedCount,
            totalSubjects: subjectsData.length,
            averageScore
          });
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching subjects data:', err);
        setError('Không thể tải dữ liệu từ server. Vui lòng liên hệ quản trị viên hoặc thử lại sau.');
        // Không sử dụng mock data, không setSubjects, setUserProgress, setUserInfo ở đây
      } finally {
        setLoading(false);
      }
    };
    
    // Chỉ gọi hàm fetchData khi user đã được xác thực
    if (user && user.id) {
      fetchData();
    }
  }, [user]); // Simplified dependency
  
  const getSubjectStatus = useCallback((subject) => {
    // Check examStatus from API first
    if (subject.examStatus) {
      if (subject.examStatus.inProgress) {
        return 'in-progress'; // Đang làm dở
      }
      if (subject.examStatus.taken) {
        return subject.examStatus.passed ? 'completed' : 'failed';
      }
      return 'available'; // Chưa làm bao giờ
    }
    
    // Fallback to userProgress
    const progress = userProgress[subject.id];
    if (!progress) return 'available';
    if (progress.passed) return 'completed';
    if (progress.attempts > 0) return 'failed';
    return 'available';
  }, [userProgress, subjects]);

  const isSubjectLocked = (subjectId) => {
    // Chỉ khóa nếu đã PASS (examStatus.locked === true)
    const subject = subjects.find(s => s.id === subjectId);
    if (subject && subject.examStatus) {
      return subject.examStatus.locked === true;
    }
    // Fallback: khóa nếu đã pass trong progress cũ
    const prog = userProgress[subjectId];
    return prog?.passed === true;
  };

  const getSubjectScore = (subject) => {
    // First check if the subject has examStatus from the new API format
    if (subject.examStatus && subject.examStatus.taken) {
      const score = Number(subject.examStatus.score) || 0;
      return isNaN(score) ? 0 : score;
    }
    
    // Fallback to the old approach using userProgress
    const progress = userProgress[subject.id];
    if (progress && progress.bestScore !== null && progress.bestScore !== undefined) {
      const score = Number(progress.bestScore) || 0;
      return isNaN(score) ? 0 : score;
    }
    
    return 0;
  };

  const getSubjectAttempts = (subject) => {
    const progress = userProgress[subject.id];
    return progress ? progress.attempts : 0;
  };

  const getLastAttempt = (subject) => {
    const progress = userProgress[subject.id];
    if (!progress || !progress.lastAttempt) return null;
    
    const date = new Date(progress.lastAttempt);
    return date.toLocaleDateString('vi-VN');
  };

  const canStartQuiz = (subject) => {
    // Chỉ cho phép bắt đầu nếu bài thi chưa bị khóa
    return !isSubjectLocked(subject.id);
  };

  const handleStartQuiz = async (subject) => {
    console.log('=== DEBUG START QUIZ ===');
    console.log('Subject:', subject);
    console.log('Subject ID:', subject.id);
    console.log('Can start quiz:', canStartQuiz(subject));
    console.log('Subject status:', getSubjectStatus(subject));
    console.log('Subject examStatus:', subject.examStatus);
    console.log('Total questions:', getSubjectQuestions(subject));
    
    // Get user information
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const studentDepartment = user.department || userInfo.department || 'Công nghệ thông tin'; // Use all available sources
    
    if (canStartQuiz(subject)) {
      try {
        // Verify question count before starting
        if (getSubjectQuestions(subject) === 0) {
          alert('Chuyên đề này chưa có câu hỏi. Vui lòng liên hệ giáo viên phụ trách.');
          return;
        }
        
        // Since the backend now handles schedule checking already, we can simplify this
        // We'll keep the canTakeQuiz check as an extra validation if needed
        const canAccess = await canTakeQuiz(subject.id).catch(err => {
          console.warn('Error checking quiz access, proceeding anyway:', err);
          return true; // Allow proceeding even if this check fails
        });
        
        if (!canAccess) {
          alert(`Không thể làm bài vào lúc này. Chuyên đề này chưa mở cho khoa ${studentDepartment}.`);
          return;
        }
        
        // Navigate to the quiz page
        console.log(`Navigating to quiz page for subject ID: ${subject.id}`);
        navigate(`/student/quiz/${subject.id}`);
      } catch (err) {
        console.error('Error starting quiz:', err);
        alert('Có lỗi xảy ra khi bắt đầu bài thi. Vui lòng thử lại sau.');
      }
    } else {
      alert('Chuyên đề này đã bị khóa hoặc bạn đã hoàn thành trước đó.');
    }
    
    console.log('=== DEBUG END ===');
  };

  const handleViewResult = async (subject) => {
    try {
      // Sử dụng API mới để lấy kết quả chi tiết
      const response = await fetch(`/api/topics/${subject.id}/exam-result`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = data.data;
        
        alert(`Kết quả chi tiết:\nChuyên đề: ${result.topicName}\nĐiểm: ${result.score}%\nĐiểm qua môn: ${result.passScore}%\nTrạng thái: ${result.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}\nThời gian làm: ${result.duration || 0} phút`);
      } else {
        // Fallback to examStatus if API fails
        if (subject.examStatus && subject.examStatus.taken) {
          alert(`Kết quả:\nĐiểm: ${subject.examStatus.score || 0}%\nTrạng thái: ${subject.examStatus.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
        } else {
          alert('Chưa có kết quả bài thi cho chuyên đề này.');
        }
      }
    } catch (error) {
      console.error('Error fetching exam result:', error);
      // Fallback to local data
      if (subject.examStatus && subject.examStatus.taken) {
        alert(`Kết quả:\nĐiểm: ${subject.examStatus.score || 0}%\nTrạng thái: ${subject.examStatus.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
      } else {
        alert('Không thể tải kết quả bài thi.');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { text: 'Đã hoàn thành', class: styles.completed };
      case 'failed':
        return { text: 'Không đạt', class: styles.failed };
      case 'in-progress':
        return { text: 'Đang thực hiện', class: styles.inProgress };
      case 'available':
        return { text: 'Có thể làm', class: styles.available };
      case 'locked':
        return { text: 'Chưa mở khóa', class: styles.locked };
      default:
        return { text: 'Không xác định', class: styles.unknown };
    }
  };

  const getProgressPercentage = () => {
    if (!userInfo.totalSubjects || userInfo.totalSubjects <= 0) {
      return 0;
    }
    const percentage = Math.round((userInfo.totalCompleted / userInfo.totalSubjects) * 100);
    return isNaN(percentage) ? 0 : percentage;
  };

  // Sửa lại các hàm lấy dữ liệu chuyên đề cho đúng từ backend
  const getSubjectQuestions = (subject) => {
    // Check all possible properties for question count
    return subject.totalQuestions ?? subject.actualQuestionCount ?? 0;
  };
  
  const getSubjectTimeLimit = (subject) => {
    // Check all possible properties for time limit
    return subject.duration_minutes !== undefined ? subject.duration_minutes : '--';
  };
  
  const getSubjectPassScore = (subject) => {
    // Check all possible properties for pass score
    return subject.pass_score !== undefined ? subject.pass_score : '--';
  };

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const kw = search.toLowerCase();
    return subjects.filter(s => (s.name||'').toLowerCase().includes(kw) || (s.description||'').toLowerCase().includes(kw));
  }, [search, subjects]);

  // Sắp xếp lại thứ tự hiển thị chuyên đề theo yêu cầu:
  // 1. Đang thực hiện (in-progress)
  // 2. Không đạt (failed)
  // 3. Có thể làm (available)
  // 4. Đã hoàn thành (completed) / khóa => xuống cuối
  // Nếu sinh viên chưa thực hiện bài thi nào (tất cả đều ở trạng thái available) => giữ nguyên thứ tự id tăng dần
  const sortedSubjects = useMemo(() => {
    const list = [...filteredSubjects];
    if (list.length === 0) return list;

    // Kiểm tra xem sinh viên đã có bất kỳ tương tác nào (khác available)
    const hasAnyAttempt = list.some(sub => {
      const st = getSubjectStatus(sub);
      return st !== 'available';
    });

    // Nếu chưa có attempt nào => sort theo id tăng dần rồi trả về
    if (!hasAnyAttempt) {
      return list.sort((a,b) => (a.id || 0) - (b.id || 0));
    }

    const rank = (subject) => {
      const status = getSubjectStatus(subject);
      switch (status) {
        case 'in-progress': return 0;
        case 'failed': return 1;
        case 'available': return 2;
        case 'completed': return 3;
        default: return 4; // unknown / locked
      }
    };

    return list.sort((a,b) => {
      const ra = rank(a); const rb = rank(b);
      if (ra !== rb) return ra - rb;
      // Nếu cùng rank thì sắp xếp theo id để ổn định
      return (a.id || 0) - (b.id || 0);
    });
  }, [filteredSubjects, getSubjectStatus]); // getSubjectStatus already depends on userProgress

  const progressPercent = getProgressPercentage();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Đang tải dữ liệu...</p>
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
          <button onClick={() => window.location.reload()}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top slim bar */}
      <div className={styles.topBar}>
        <div className={styles.topNav}>
          <span className={styles.topNavItem}>Khóa học</span>
          <span className={styles.topNavItem}>Hỗ trợ</span>
        </div>
        <div className={styles.userMini}>
          <span><i className="fas fa-phone" style={{marginRight:4}} /> Hỗ trợ: 0123 456 789</span>
        </div>
      </div>
      {/* Brand header */}
      <div className={styles.brandHeader}>
        <div className={styles.brandLeft}>
          <div className={styles.logo}><i className="fas fa-graduation-cap" /></div>
          <div>
            <h1 className={styles.siteTitle}>VMU</h1>
            <p className={styles.siteSubtitle}>Sinh hoạt công dân</p>
          </div>
        </div>
        <div className={styles.brandRight}>
          <div className={styles.userMini}><StudentMenu /></div>
        </div>
      </div>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h2 className={styles.heroTitle}>Các chuyên đề hiện có</h2>
          <p className={styles.heroDesc}>Hoàn thành tất cả chuyên đề để kết thúc học phần sinh hoạt công dân</p>
        </div>
      </div>
      {/* Content layout */}
      <div className={styles.content}>
        {/* Main list */}
        <div>
          <section className={styles.subjectsSection}>
            <h2 className={styles.sectionTitle}>Danh sách chuyên đề</h2>
            <div className={styles.subjectsGrid}>
            {filteredSubjects.length === 0 ? (
              // Không hiển thị gì nếu chỉ là do tìm kiếm không có kết quả (subjects vẫn có dữ liệu gốc)
              subjects.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-info-circle"></i>
                  {userInfo.errorReason === 'missing_student_info' || userInfo.errorReason === 'missing_department' ? (
                    <p>Bạn cần cập nhật thông tin khoa/ngành/lớp để xem danh sách chuyên đề.</p>
                  ) : userInfo.errorReason === 'no_schedules_for_department' ? (
                    <p>Hiện tại chưa có chuyên đề nào được xếp lịch cho khoa {userInfo.department || 'của bạn'}.</p>
                  ) : userInfo.errorReason === 'no_active_schedule' ? (
                    <p>Hiện tại chưa có lịch thi nào trong hệ thống. Vui lòng liên hệ với giáo viên hoặc quản trị viên để được hướng dẫn.</p>
                  ) : (
                    <p>Hiện tại chưa có chuyên đề nào được xếp lịch cho khoa/ngành/lớp của bạn.</p>
                  )}
                  <button 
                    style={{ 
                      marginTop: '15px', 
                      padding: '8px 16px', 
                      background: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.location.reload()}
                  >
                    Tải lại trang
                  </button>
                </div>
              ) : null
            ) : (
              sortedSubjects.map((subject) => {
                const status = getSubjectStatus(subject);
                const score = getSubjectScore(subject);
                const attempts = getSubjectAttempts(subject);
                const lastAttempt = getLastAttempt(subject);
                const statusBadge = getStatusBadge(status);
                const locked = isSubjectLocked(subject.id);

                return (
                  <div key={subject.id} className={`${styles.subjectCard} ${styles[status]} ${locked ? styles.locked : ''}`}>
                    <div className={styles.cardHeader}>
                      <div className={styles.subjectNumber}>
                        Chuyên đề {subject.id}
                      </div>
                      <div className={`${styles.statusBadge} ${statusBadge.class}`}>
                        {statusBadge.text}
                      </div>
                    </div>

                    <div className={styles.cardContent}>
                      <h3 className={styles.subjectTitle}>{subject.name}</h3>
                      <p className={styles.subjectDescription}>{subject.description}</p>

                      <div className={styles.subjectMeta}>
                        <div className={styles.metaItem}>
                          <i className="fas fa-question-circle"></i>
                          <span>Số câu hỏi: {getSubjectQuestions(subject)} </span>
                        </div>
                        <div className={styles.metaItem}>
                          <i className="fas fa-clock"></i>
                          <span>Thời gian làm: {getSubjectTimeLimit(subject)} phút</span>
                        </div>
                        <div className={styles.metaItem}>
                          <i className="fas fa-target"></i>
                          <span>Điểm qua môn: {getSubjectPassScore(subject)}%</span>
                        </div>
                      </div>

                      {attempts > 0 && (
                        <div className={styles.progressInfo}>
                          <div className={styles.scoreInfo}>
                            <span className={styles.scoreLabel}>Điểm cao nhất:</span>
                            <span className={`${styles.scoreValue} ${score >= getSubjectPassScore(subject) ? styles.passed : styles.failed}`}>
                              {score}%
                            </span>
                          </div>
                          <div className={styles.attemptInfo}>
                            <span>Số lần làm: {attempts}</span>
                            {lastAttempt && <span>Lần cuối: {lastAttempt}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      {locked ? (
                        <button className={styles.lockedBtn} disabled>
                          <i className="fas fa-lock"></i>
                          Đã hoàn thành
                        </button>
                      ) : status === 'completed' ? (
                        <div className={styles.actionGroup}>
                          <button 
                            className={styles.viewResultBtn}
                            onClick={() => handleViewResult(subject)}
                          >
                            <i className="fas fa-chart-bar"></i>
                            Xem kết quả
                          </button>
                          <button 
                            className={styles.retakeBtn}
                            onClick={() => handleStartQuiz(subject)}
                          >
                            <i className="fas fa-redo"></i>
                            Làm lại
                          </button>
                        </div>
                      ) : status === 'failed' ? (
                        <div className={styles.actionGroup}>
                          <button 
                            className={styles.viewResultBtn}
                            onClick={() => handleViewResult(subject)}
                          >
                            <i className="fas fa-chart-bar"></i>
                            Xem kết quả
                          </button>
                          <button 
                            className={styles.retakeBtn}
                            onClick={() => handleStartQuiz(subject)}
                          >
                            <i className="fas fa-redo"></i>
                            Làm lại
                          </button>
                        </div>
                      ) : status === 'in-progress' ? (
                        <button 
                          className={styles.continueBtn}
                          onClick={() => handleStartQuiz(subject)}
                        >
                          <i className="fas fa-play-circle"></i>
                          Tiếp tục
                        </button>
                      ) : status === 'available' ? (
                        <button 
                          className={styles.startBtn}
                          onClick={() => handleStartQuiz(subject)}
                        >
                          <i className="fas fa-play"></i>
                          Bắt đầu làm bài
                        </button>
                      ) : (
                        <button className={styles.lockedBtn} disabled>
                          <i className="fas fa-lock"></i>
                          Chưa mở khóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </section>
        </div>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.statsCard}>
            <h3 className={styles.statsHeader}>Tiến độ học tập</h3>
            <div className={styles.statList}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Hoàn thành</span>
                <span className={styles.statValue}>{userInfo.totalCompleted}/{userInfo.totalSubjects}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Tiến độ</span>
                <span className={styles.statValue}>{progressPercent}%</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Điểm TB</span>
                <span className={styles.statValue}>{(userInfo.averageScore && !isNaN(userInfo.averageScore)) ? userInfo.averageScore : 0}%</span>
              </div>
              <div className={styles.progressBarOuter}>
                <div className={styles.progressBarInner} style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
          <div className={styles.searchCard}>
            <h3 className={styles.searchTitle}>Tìm kiếm</h3>
            <input
              className={styles.searchInput}
              placeholder="Nhập tên chuyên đề..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TopicListPage;