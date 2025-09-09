import apiClientService from './apiClientService';

class ReportService {
  // Lấy thống kê tổng quan
  async getExamStatistics() {
    try {
      const response = await apiClientService.get('/admin/reports/statistics');
      return response;
    } catch (error) {
      console.error('Error getting exam statistics:', error);
      throw error;
    }
  }

  // Lấy báo cáo chi tiết với filter
  async getDetailedReport(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.topicId) queryParams.append('topicId', filters.topicId);
      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
      if (filters.majorId) queryParams.append('majorId', filters.majorId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await apiClientService.get(`/admin/reports/detailed?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Error getting detailed report:', error);
      throw error;
    }
  }

  // Lấy danh sách options cho filter
  async getFilterOptions() {
    try {
      const response = await apiClientService.get('/admin/reports/filter-options');
      return response;
    } catch (error) {
      console.error('Error getting filter options:', error);
      throw error;
    }
  }

  // Lấy thống kê sinh viên hoàn thành
  async getStudentCompletionStats() {
    try {
      const response = await apiClientService.get('/admin/reports/student-completion');
      return response;
    } catch (error) {
      console.error('Error getting student completion stats:', error);
      throw error;
    }
  }

  // Xuất báo cáo ra Excel
  async exportToExcel(data, filename = 'exam_report') {
    try {
      // Import XLSX dynamically
      const XLSX = await import('xlsx');
      
      // Tạo workbook
      const workbook = XLSX.utils.book_new();

      // Tạo worksheet cho tổng quan
      if (data.overview) {
        const overviewData = [
          ['Chỉ số', 'Giá trị'],
          ['Tổng sinh viên tham gia', data.overview.studentsWithExams],
          ['Số sinh viên đạt', data.overview.passedStudents],
          ['Số sinh viên không đạt', data.overview.failedStudents],
          ['Tỷ lệ đạt (%)', data.overview.passRate]
        ];
        
        const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Tổng quan');
      }

      // Tạo worksheet cho thống kê theo chuyên đề
      if (data.topicStatistics && data.topicStatistics.length > 0) {
        const topicHeaders = [
          'Chuyên đề',
          'Điểm đạt',
          'Tổng lượt thi',
          'Số lượt đạt',
          'Số lượt không đạt',
          'Điểm trung bình',
          'Điểm cao nhất',
          'Điểm thấp nhất'
        ];
        
        const topicData = [
          topicHeaders,
          ...data.topicStatistics.map(topic => [
            topic.topic_name,
            topic.pass_score,
            topic.total_attempts,
            topic.passed_count,
            topic.failed_count,
            topic.average_score,
            topic.highest_score,
            topic.lowest_score
          ])
        ];
        
        const topicSheet = XLSX.utils.aoa_to_sheet(topicData);
        XLSX.utils.book_append_sheet(workbook, topicSheet, 'Thống kê chuyên đề');
      }

      // Tạo worksheet cho báo cáo chi tiết
      if (data.reports && data.reports.length > 0) {
        const detailHeaders = [
          'Mã sinh viên',
          'Họ tên',
          'Email',
          'Lớp',
          'Ngành',
          'Khoa',
          'Chuyên đề',
          'Điểm đạt',
          'Điểm đạt được',
          'Kết quả',
          'Thời gian bắt đầu',
          'Thời gian kết thúc',
          'Thời gian làm bài (phút)'
        ];
        
        const detailData = [
          detailHeaders,
          ...data.reports.map(report => [
            report.student_code,
            report.student_name,
            report.email,
            report.class_name,
            report.major_name,
            report.department_name,
            report.topic_name,
            report.pass_score,
            report.score,
            report.result,
            new Date(report.start_time).toLocaleString('vi-VN'),
            new Date(report.end_time).toLocaleString('vi-VN'),
            report.duration_minutes
          ])
        ];
        
        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
        XLSX.utils.book_append_sheet(workbook, detailSheet, 'Chi tiết kết quả');
      }

      // Xuất file
      const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      return { success: true, fileName };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }
}

const reportService = new ReportService();
export default reportService;