import * as XLSX from 'xlsx';

// Export data to Excel file
export const exportToExcel = (data, filename = 'export') => {
  try {
    const workbook = XLSX.utils.book_new();
    
    if (Array.isArray(data)) {
      // Simple array data
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    } else if (typeof data === 'object') {
      // Multiple sheets
      Object.keys(data).forEach(sheetName => {
        const worksheet = XLSX.utils.json_to_sheet(data[sheetName]);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });
    }
    
    const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

// Export exam statistics to Excel
export const exportExamStatistics = (statistics) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Overview sheet
    if (statistics.overview) {
      const overviewData = [
        { 'Chỉ số': 'Tổng sinh viên tham gia', 'Giá trị': statistics.overview.studentsWithExams },
        { 'Chỉ số': 'Số sinh viên đạt', 'Giá trị': statistics.overview.passedStudents },
        { 'Chỉ số': 'Số sinh viên không đạt', 'Giá trị': statistics.overview.failedStudents },
        { 'Chỉ số': 'Tỷ lệ đạt (%)', 'Giá trị': statistics.overview.passRate }
      ];
      
      const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Tổng quan');
    }

    // Topic statistics sheet
    if (statistics.topicStatistics && statistics.topicStatistics.length > 0) {
      const topicData = statistics.topicStatistics.map(topic => ({
        'Chuyên đề': topic.topic_name,
        'Điểm đạt': topic.pass_score,
        'Tổng lượt thi': topic.total_attempts,
        'Số lượt đạt': topic.passed_count,
        'Số lượt không đạt': topic.failed_count,
        'Điểm trung bình': topic.average_score,
        'Điểm cao nhất': topic.highest_score,
        'Điểm thấp nhất': topic.lowest_score
      }));
      
      const topicSheet = XLSX.utils.json_to_sheet(topicData);
      XLSX.utils.book_append_sheet(workbook, topicSheet, 'Thống kê chuyên đề');
    }

    // Department statistics sheet
    if (statistics.departmentStatistics && statistics.departmentStatistics.length > 0) {
      const deptData = statistics.departmentStatistics.map(dept => ({
        'Khoa': dept.department_name,
        'Ngành': dept.major_name,
        'Tổng sinh viên': dept.total_students,
        'SV đạt': dept.passed_students,
        'SV không đạt': dept.failed_students,
        'Điểm trung bình': dept.average_score
      }));
      
      const deptSheet = XLSX.utils.json_to_sheet(deptData);
      XLSX.utils.book_append_sheet(workbook, deptSheet, 'Thống kê khoa/ngành');
    }

    const fileName = `thong_ke_thi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting exam statistics:', error);
    throw error;
  }
};

// Export detailed exam report to Excel
export const exportDetailedReport = (reports) => {
  try {
    const data = reports.map(report => ({
      'Mã sinh viên': report.student_code,
      'Họ tên': report.student_name,
      'Email': report.email,
      'Lớp': report.class_name,
      'Ngành': report.major_name,
      'Khoa': report.department_name,
      'Chuyên đề': report.topic_name,
      'Điểm đạt': report.pass_score,
      'Điểm đạt được': report.score,
      'Kết quả': report.result,
      'Thời gian bắt đầu': new Date(report.start_time).toLocaleString('vi-VN'),
      'Thời gian kết thúc': new Date(report.end_time).toLocaleString('vi-VN'),
      'Thời gian làm bài (phút)': report.duration_minutes
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi tiết kết quả thi');

    const fileName = `chi_tiet_ket_qua_thi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting detailed report:', error);
    throw error;
  }
};