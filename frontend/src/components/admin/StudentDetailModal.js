import React, { useState, useEffect, useCallback } from 'react';
import styles from './StudentDetailModal.module.css';

const StudentDetailModal = ({ studentId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);

  const loadStudentDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports/student-detail?studentId=${studentId}&timeRange=365`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudentData(data.data);
      }
    } catch (error) {
      console.error('Error loading student detail:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentDetail();
    }
  }, [isOpen, studentId, loadStudentDetail]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>📊 Chi tiết Sinh viên</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : studentData ? (
          <div className={styles.modalBody}>
            {/* Student Info */}
            <div className={styles.studentInfo}>
              <div className={styles.infoCard}>
                <h3>👤 Thông tin cơ bản</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Mã sinh viên:</label>
                    <span>{studentData.studentInfo.student_code}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Họ tên:</label>
                    <span>{studentData.studentInfo.full_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email:</label>
                    <span>{studentData.studentInfo.email}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Lớp:</label>
                    <span>{studentData.studentInfo.class_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Ngành:</label>
                    <span>{studentData.studentInfo.major_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Khoa:</label>
                    <span>{studentData.studentInfo.department_name}</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className={styles.metricsCard}>
                <h3>📈 Chỉ số học tập</h3>
                <div className={styles.metricsGrid}>
                  <div className={styles.metric}>
                    <div className={styles.metricValue}>{studentData.performanceMetrics.total_exams || 0}</div>
                    <div className={styles.metricLabel}>Tổng bài thi</div>
                  </div>
                  <div className={styles.metric}>
                    <div className={styles.metricValue}>{studentData.performanceMetrics.avg_score || 'N/A'}</div>
                    <div className={styles.metricLabel}>Điểm trung bình</div>
                  </div>
                  <div className={styles.metric}>
                    <div className={styles.metricValue}>{studentData.performanceMetrics.pass_rate || 0}%</div>
                    <div className={styles.metricLabel}>Tỷ lệ đạt</div>
                  </div>
                  <div className={styles.metric}>
                    <div className={`${styles.metricValue} ${styles.riskLevel} ${styles[studentData.performanceMetrics.risk_color]}`}>
                      {studentData.performanceMetrics.risk_level}
                    </div>
                    <div className={styles.metricLabel}>Mức độ rủi ro</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam History */}
            <div className={styles.examHistory}>
              <h3>📚 Lịch sử làm bài</h3>
              <div className={styles.tableContainer}>
                <table className={styles.examTable}>
                  <thead>
                    <tr>
                      <th>Chuyên đề</th>
                      <th>Thời gian</th>
                      <th>Điểm</th>
                      <th>Thời lượng</th>
                      <th>Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.examHistory.map((exam, index) => (
                      <tr key={index}>
                        <td>{exam.topic_name}</td>
                        <td>{new Date(exam.start_time).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className={`${styles.score} ${exam.passed ? styles.passed : styles.failed}`}>
                            {exam.score || 'N/A'}
                          </span>
                        </td>
                        <td>{exam.duration_minutes || 'N/A'} phút</td>
                        <td>
                          <span className={`${styles.badge} ${exam.passed ? styles.success : styles.danger}`}>
                            {exam.passed ? 'Đạt' : 'Không đạt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            {studentData.recommendations && studentData.recommendations.length > 0 && (
              <div className={styles.recommendations}>
                <h3>💡 Đề xuất</h3>
                <div className={styles.recommendationsList}>
                  {studentData.recommendations.map((rec, index) => (
                    <div key={index} className={`${styles.recommendation} ${styles[rec.type]}`}>
                      <div className={styles.recTitle}>{rec.title}</div>
                      <div className={styles.recDescription}>{rec.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noData}>
            <p>Không có dữ liệu sinh viên</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailModal;
