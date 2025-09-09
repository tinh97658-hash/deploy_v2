const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');

class ReportController {
  // Lấy tổng quan báo cáo kết quả thi
  static async getExamStatistics(req, res) {
    try {
      console.log('Getting exam statistics...');
      
      // Lấy thống kê tổng quan
      const totalStudentsQuery = `
        SELECT COUNT(DISTINCT s.id) as total_students
        FROM Students s
      `;
      
      // Đếm sinh viên đã làm bài (có ít nhất 1 exam SUBMITTED)
      const studentsWithExamsQuery = `
        SELECT COUNT(DISTINCT s.id) as students_with_exams
        FROM Students s
        WHERE EXISTS (
          SELECT 1 FROM Exams e 
          WHERE e.student_id = s.id AND e.status = 'SUBMITTED'
        )
      `;
      
      // Đếm sinh viên đạt (có ít nhất 1 chuyên đề đạt theo pass_score của chuyên đề)
      const passedStudentsQuery = `
        SELECT COUNT(DISTINCT s.id) as passed_students
        FROM Students s
        WHERE EXISTS (
          SELECT 1 FROM Exams e 
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.student_id = s.id AND e.status = 'SUBMITTED'
          GROUP BY e.topic_id, t.pass_score
          HAVING MAX(e.score) >= t.pass_score
        )
      `;

      // Thêm thống kê về bài thi
      const examStatsQuery = `
        SELECT 
          COUNT(*) as total_exams,
          COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) as passed_exams,
          COUNT(CASE WHEN e.score < t.pass_score THEN 1 END) as failed_exams
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.status = 'SUBMITTED'
      `;

      // Thực hiện các truy vấn song song
      const [totalStudents, studentsWithExams, passedStudents, examStats] = await Promise.all([
        DatabaseService.execute(totalStudentsQuery),
        DatabaseService.execute(studentsWithExamsQuery),
        DatabaseService.execute(passedStudentsQuery),
        DatabaseService.execute(examStatsQuery)
      ]);

      // Lấy thống kê theo chuyên đề
      const topicStatsQuery = `
        SELECT 
          t.id,
          t.name as topic_name,
          t.pass_score as pass_score,
          COUNT(e.id) as total_attempts,
          COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) as passed_count,
          COUNT(CASE WHEN e.score < t.pass_score THEN 1 END) as failed_count,
          ROUND(AVG(e.score), 2) as average_score,
          MAX(e.score) as highest_score,
          MIN(e.score) as lowest_score
        FROM Topics t
        LEFT JOIN Exams e ON t.id = e.topic_id AND e.status = 'SUBMITTED'
        GROUP BY t.id, t.name, t.pass_score
        ORDER BY t.name
      `;

      const topicStats = await DatabaseService.execute(topicStatsQuery);

  // Lấy thống kê theo khoa/ngành
  // Logic: Sinh viên chỉ được tính "đạt" nếu đạt TẤT CẢ chuyên đề (score >= pass_score từng chuyên đề)
      const departmentStatsQuery = `
        SELECT 
          d.id as department_id,
          d.name as department_name,
          m.id as major_id,
          m.name as major_name,
          COUNT(DISTINCT s.id) as total_students,
          ROUND(AVG(e.score), 2) as average_score
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        LEFT JOIN Exams e ON s.id = e.student_id AND e.status = 'SUBMITTED'
        GROUP BY d.id, d.name, m.id, m.name
        HAVING total_students > 0
        ORDER BY d.name, m.name
      `;

      const departmentStats = await DatabaseService.execute(departmentStatsQuery);

      // Lấy thống kê theo sinh viên
      const studentStatsQuery = `
        SELECT 
          s.id,
          s.student_code,
          u.full_name as student_name,
          c.name as class_name,
          m.name as major_name,
          COUNT(e.id) as total_attempts,
          COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) as passed_count,
          COUNT(CASE WHEN e.score < t.pass_score THEN 1 END) as failed_count,
          ROUND(AVG(e.score), 2) as average_score,
          MAX(e.score) as highest_score,
          MIN(e.score) as lowest_score
        FROM Students s
        LEFT JOIN Users u ON s.user_id = u.id
        LEFT JOIN Classes c ON s.class_id = c.id
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Exams e ON s.id = e.student_id AND e.status = 'SUBMITTED'
        LEFT JOIN Topics t ON e.topic_id = t.id
        GROUP BY s.id, s.student_code, u.full_name, c.name, m.name
        HAVING total_attempts > 0
        ORDER BY s.student_code
      `;

      const studentStats = await DatabaseService.execute(studentStatsQuery);

  // Tính toán sinh viên đạt/không đạt cho từng khoa/ngành
  // Sinh viên đạt = đã làm hết tất cả chuyên đề và mỗi chuyên đề đạt >= pass_score tương ứng
      for (const dept of departmentStats) {
        if (dept.major_id) {
          // Lấy tổng số chuyên đề
          const totalTopicsQuery = `SELECT COUNT(*) as total_topics FROM Topics`;
          const totalTopicsResult = await DatabaseService.execute(totalTopicsQuery);
          const totalTopics = totalTopicsResult[0].total_topics;

          // Lấy sinh viên đạt: làm TẤT CẢ chuyên đề và MỖI CHUYÊN ĐỀ đạt theo pass_score của chuyên đề đó
          const passedStudentsQuery = `
            SELECT COUNT(DISTINCT s.id) as passed_students
            FROM Students s
            JOIN Classes c ON s.class_id = c.id
            JOIN Majors m ON c.major_id = m.id
            WHERE m.id = ?
            AND s.id IN (
              SELECT e1.student_id
              FROM Exams e1
              WHERE e1.status = 'SUBMITTED'
              GROUP BY e1.student_id
              HAVING COUNT(DISTINCT e1.topic_id) = ?
            )
            AND s.id NOT IN (
              SELECT DISTINCT e2.student_id
              FROM Exams e2
              JOIN Topics t2 ON e2.topic_id = t2.id
              WHERE e2.status = 'SUBMITTED'
              GROUP BY e2.student_id, e2.topic_id, t2.pass_score
              HAVING MAX(e2.score) < t2.pass_score
            )
          `;

          const passedResult = await DatabaseService.execute(passedStudentsQuery, [
            dept.major_id, totalTopics
          ]);

          // Sinh viên không đạt = tổng sinh viên - sinh viên đạt
          dept.passed_students = passedResult[0].passed_students || 0;
          dept.failed_students = dept.total_students - dept.passed_students;
        } else {
          dept.passed_students = 0;
          dept.failed_students = dept.total_students;
        }
      }

      const statistics = {
        overview: {
          totalStudents: totalStudents[0].total_students || 0,
          studentsWithExams: studentsWithExams[0].students_with_exams || 0,
          passedStudents: passedStudents[0].passed_students || 0,
          failedStudents: (studentsWithExams[0].students_with_exams || 0) - (passedStudents[0].passed_students || 0),
          passRate: studentsWithExams[0].students_with_exams > 0 
            ? Math.round((passedStudents[0].passed_students / studentsWithExams[0].students_with_exams) * 100) 
            : 0,
          // Thêm thống kê bài thi (để backup)
          totalExams: examStats[0].total_exams || 0,
          passedExams: examStats[0].passed_exams || 0,
          failedExams: examStats[0].failed_exams || 0,
          examPassRate: examStats[0].total_exams > 0 
            ? Math.round((examStats[0].passed_exams / examStats[0].total_exams) * 100) 
            : 0
        },
        studentStatistics: studentStats,
        departmentStatistics: departmentStats
      };

      return ResponseHelper.success(res, statistics, 'Lấy thống kê báo cáo thành công');
      
    } catch (error) {
      console.error('Get exam statistics error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy thống kê: ' + error.message, 500);
    }
  }

  // Lấy báo cáo chi tiết theo chuyên đề
  static async getDetailedReport(req, res) {
    try {
      const { topicId, departmentId, majorId, startDate, endDate } = req.query;
      
      console.log('Getting detailed report with filters:', { topicId, departmentId, majorId, startDate, endDate });
      
      let whereConditions = ['e.status = "SUBMITTED"'];
      let queryParams = [];
      
      if (topicId) {
        whereConditions.push('t.id = ?');
        queryParams.push(topicId);
      }
      
      if (departmentId) {
        whereConditions.push('d.id = ?');
        queryParams.push(departmentId);
      }
      
      if (majorId) {
        whereConditions.push('m.id = ?');
        queryParams.push(majorId);
      }
      
      if (startDate) {
        whereConditions.push('DATE(e.end_time) >= ?');
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereConditions.push('DATE(e.end_time) <= ?');
        queryParams.push(endDate);
      }

      const detailedReportQuery = `
        SELECT 
          e.id as exam_id,
          s.student_code,
          u.full_name as student_name,
          u.email,
          c.name as class_name,
          m.name as major_name,
          d.name as department_name,
          t.name as topic_name,
          t.pass_score as pass_score,
          e.score,
          CASE WHEN e.score >= t.pass_score THEN 'Đạt' ELSE 'Không đạt' END as result,
          e.start_time,
          e.end_time,
          TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time) as duration_minutes
        FROM Exams e
        JOIN Students s ON e.student_id = s.id
        JOIN Users u ON s.user_id = u.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        JOIN Topics t ON e.topic_id = t.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY e.end_time DESC, s.student_code
      `;

      const detailedReport = await DatabaseService.execute(detailedReportQuery, queryParams);

      return ResponseHelper.success(res, {
        reports: detailedReport,
        totalRecords: detailedReport.length,
        filters: { topicId, departmentId, majorId, startDate, endDate }
      }, 'Lấy báo cáo chi tiết thành công');
      
    } catch (error) {
      console.error('Get detailed report error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy báo cáo chi tiết: ' + error.message, 500);
    }
  }

  // Lấy danh sách để filter
  static async getFilterOptions(req, res) {
    try {
      // Lấy danh sách chuyên đề
      const topicsQuery = `
        SELECT id, name 
        FROM Topics 
        ORDER BY name
      `;
      
      // Lấy danh sách khoa
      const departmentsQuery = `
        SELECT id, name 
        FROM Departments 
        ORDER BY name
      `;
      
      // Lấy danh sách ngành
      const majorsQuery = `
        SELECT m.id, m.name, m.department_id, d.name as department_name
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        ORDER BY d.name, m.name
      `;

      const [topics, departments, majors] = await Promise.all([
        DatabaseService.execute(topicsQuery),
        DatabaseService.execute(departmentsQuery),
        DatabaseService.execute(majorsQuery)
      ]);

      return ResponseHelper.success(res, {
        topics,
        departments,
        majors
      }, 'Lấy danh sách filter thành công');
      
    } catch (error) {
      console.error('Get filter options error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy danh sách filter: ' + error.message, 500);
    }
  }

  // Lấy thống kê sinh viên hoàn thành
  static async getStudentCompletionStats(req, res) {
    try {
      // Lấy tổng số chuyên đề
      const totalTopicsQuery = `SELECT COUNT(*) as total_topics FROM Topics`;
      const totalTopicsResult = await DatabaseService.execute(totalTopicsQuery);
      const totalTopics = totalTopicsResult[0].total_topics;

      // Lấy danh sách sinh viên và tình trạng hoàn thành
      const studentStatsQuery = `
        SELECT 
          s.id as student_id,
          s.student_code,
          u.full_name as student_name,
          c.name as class_name,
          m.name as major_name,
          d.name as department_name,
          COUNT(DISTINCT e.topic_id) as completed_topics,
          COUNT(DISTINCT CASE WHEN e.score >= t.pass_score THEN e.topic_id END) as passed_topics,
          ROUND(AVG(e.score), 2) as average_score,
          CASE 
            WHEN COUNT(DISTINCT e.topic_id) = ? AND COUNT(DISTINCT CASE WHEN e.score >= t.pass_score THEN e.topic_id END) = ? 
            THEN 'Hoàn thành' 
            ELSE 'Chưa hoàn thành' 
          END as completion_status
  FROM Students s
  JOIN Users u ON s.user_id = u.id
  JOIN Classes c ON s.class_id = c.id
  JOIN Majors m ON c.major_id = m.id
  JOIN Departments d ON m.department_id = d.id
  LEFT JOIN Exams e ON s.id = e.student_id AND e.status = 'SUBMITTED'
  LEFT JOIN Topics t ON e.topic_id = t.id
        GROUP BY s.id, s.student_code, u.full_name, c.name, m.name, d.name
        ORDER BY d.name, m.name, c.name, s.student_code
      `;

      const studentStats = await DatabaseService.execute(studentStatsQuery, [totalTopics, totalTopics]);

      return ResponseHelper.success(res, {
        students: studentStats,
        totalTopics: totalTopics
      }, 'Lấy thống kê sinh viên thành công');
      
    } catch (error) {
      console.error('Get student completion stats error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy thống kê sinh viên: ' + error.message, 500);
    }
  }
}

module.exports = ReportController;
