import React, { useState, useMemo } from 'react';
import styles from './MajorDetailModal.module.css';

const MajorDetailModal = ({ majorDetailData, isOpen, onClose }) => {
  const [selectedClass, setSelectedClass] = useState('all'); // 'all' or specific class_id
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'passed', 'failed', 'not_taken'

  console.log('MajorDetailModal props:', { majorDetailData, isOpen });

  // Get filtered students based on selected class and status
  const filteredStudents = useMemo(() => {
    if (!majorDetailData || !majorDetailData.classes) return [];
    
    let students = [];
    const { classes } = majorDetailData;
    
    // Get students from selected class or all classes
    if (selectedClass === 'all') {
      classes.forEach(classData => {
        classData.students.forEach(student => {
          students.push({
            class_name: classData.class_name,
            class_id: classData.class_id,
            ...student
          });
        });
      });
    } else {
      const selectedClassData = classes.find(c => c.class_id === parseInt(selectedClass));
      if (selectedClassData) {
        selectedClassData.students.forEach(student => {
          students.push({
            class_name: selectedClassData.class_name,
            class_id: selectedClassData.class_id,
            ...student
          });
        });
      }
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'passed') {
        students = students.filter(s => s.status === 'ĐẠT');
      } else if (statusFilter === 'failed') {
        students = students.filter(s => s.status === 'KHÔNG ĐẠT');
      } else if (statusFilter === 'not_taken') {
        students = students.filter(s => s.status === 'CHƯA THI');
      }
    }

    return students;
  }, [majorDetailData, selectedClass, statusFilter]);

  if (!isOpen || !majorDetailData) {
    console.log('Modal not shown because:', { isOpen, hasData: !!majorDetailData });
    return null;
  }

  const { majorInfo, classes } = majorDetailData;

  // Đã loại bỏ chức năng xuất Excel theo yêu cầu

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2>Chi tiết ngành: {majorInfo.major_name}</h2>
            <p>Khoa: {majorInfo.dept_name}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label htmlFor="classFilter">Chọn lớp để xem chi tiết:</label>
              <select 
                id="classFilter"
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">-- Chọn một lớp --</option>
                {classes.map(classData => (
                  <option key={classData.class_id} value={classData.class_id}>
                    {classData.class_name} ({classData.students.length} SV)
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="statusFilter">Lọc theo kết quả:</label>
              <select 
                id="statusFilter"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
                disabled={selectedClass === 'all'}
              >
                <option value="all">Tất cả</option>
                <option value="passed">Đạt</option>
                <option value="failed">Không đạt</option>
                <option value="not_taken">Chưa thi</option>
              </select>
            </div>

            {/* Nút xuất Excel đã được gỡ bỏ */}
          </div>

          {/* Notice or Student List */}
          {selectedClass === 'all' ? (
            <div className={styles.notice}>
              👆 Hãy chọn một lớp để xem danh sách sinh viên chi tiết
            </div>
          ) : (
            <div className={styles.studentList}>
              <h3>
                Danh sách sinh viên - {classes.find(c => c.class_id === parseInt(selectedClass))?.class_name}
                {statusFilter !== 'all' && ` - ${statusFilter === 'passed' ? 'Đạt' : statusFilter === 'failed' ? 'Không đạt' : 'Chưa thi'}`}
                ({filteredStudents.length} sinh viên)
              </h3>
              
              <div className={styles.tableContainer}>
                <table className={styles.studentTable}>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Mã SV</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>SĐT</th>
                      <th>Chuyên đề hoàn thành</th>
                      <th>Kết quả</th>
                      <th>Lần thi cuối</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr key={`${student.class_id}-${student.student_id}`}>
                        <td>{index + 1}</td>
                        <td>{student.student_code}</td>
                        <td>{student.student_name}</td>
                        <td>{student.email || 'N/A'}</td>
                        <td>{student.phone_number || 'N/A'}</td>
                        <td>{student.completed_topics || 0}/{student.total_topics || 0}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${
                            student.status === 'ĐẠT' ? styles.passed : 
                            student.status === 'KHÔNG ĐẠT' ? styles.failed : styles.notTaken
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td>{student.exam_date || 'Chưa thi'}</td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan="8" className={styles.noData}>
                          Không có sinh viên nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MajorDetailModal;
