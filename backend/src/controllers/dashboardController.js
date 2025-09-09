const DatabaseService = require('../services/DatabaseService');
const ResponseHelper = require('../utils/ResponseHelper');

class DashboardController {
  // Lấy dữ liệu tổng quan cho dashboard
  static async getDashboardData(req, res) {
    try {
  // QUY ƯỚC PASS MỚI:
  //  - e.status = 'SUBMITTED'
  //  - e.score > 0
  //  - t.pass_score > 0
  //  - e.score >= t.pass_score
  // Mọi trường hợp điểm = 0 hoặc pass_score <= 0 đều KHÔNG tính pass.
      // Lấy thống kê sinh viên từ cấu trúc database
      const studentStatsQuery = `
        SELECT 
          COUNT(DISTINCT s.id) as totalStudents
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        WHERE u.role = 'STUDENT'
      `;
      
      const studentStats = await DatabaseService.execute(studentStatsQuery);
      const stats = studentStats[0] || { totalStudents: 0 };

      // Lấy thống kê bài thi (chỉ coi hoàn thành khi pass)
      // Lưu ý: chỉ coi là pass khi pass_score hợp lệ (>0) và điểm > 0
      const examStatsQuery = `
        SELECT 
          COUNT(DISTINCT e.id) as totalExams,
          COUNT(DISTINCT CASE 
            WHEN e.status = 'SUBMITTED' 
              AND e.score IS NOT NULL AND e.score > 0
              AND t.pass_score IS NOT NULL AND t.pass_score > 0
              AND e.score >= t.pass_score 
            THEN e.id END) as passedExams,
          COUNT(DISTINCT CASE 
            WHEN e.status = 'SUBMITTED'
              AND e.score IS NOT NULL
              AND t.pass_score IS NOT NULL AND t.pass_score > 0
              AND e.score < t.pass_score 
            THEN e.id END) as failedExams,
          COUNT(DISTINCT CASE WHEN e.status = 'IN_PROGRESS' THEN e.id END) as inProgressExams
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
      `;
      const examStats = await DatabaseService.execute(examStatsQuery);
  const examData = examStats[0] || { totalExams: 0, passedExams: 0, failedExams: 0, inProgressExams: 0 };

      // Lấy thống kê theo khoa
      const departmentStatsQuery = `
        SELECT 
          d.name as department_name,
          COUNT(DISTINCT s.id) as student_count
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        GROUP BY d.id, d.name
        ORDER BY student_count DESC
      `;
      
      const departmentStats = await DatabaseService.execute(departmentStatsQuery);

      // Lấy thống kê tổng quan hệ thống
      const systemStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Topics) as totalTopics,
          (SELECT COUNT(*) FROM Questions) as totalQuestions,
          (SELECT COUNT(*) FROM Departments) as totalDepartments,
          (SELECT COUNT(*) FROM Majors) as totalMajors
      `;
      const systemStats = await DatabaseService.execute(systemStatsQuery);
      const systemData = systemStats[0] || {
        totalTopics: 0,
        totalQuestions: 0,
        totalDepartments: 0,
        totalMajors: 0
      };

      // Format dữ liệu thống kê theo khoa cho biểu đồ
      const formattedDepartmentStats = departmentStats.map(dept => ({
        name: dept.department_name || 'Chưa đặt tên',
        studentCount: dept.student_count || 0
      }));

      // Lấy hoạt động gần đây từ bài thi
        const recentActivitiesQuery = `
          SELECT 
            e.id,
            u.full_name as student_name,
            t.name as topic_name,
            e.status,
            e.score,
            t.pass_score,
            e.end_time,
            e.start_time
          FROM Exams e
          JOIN Students s ON e.student_id = s.id
          JOIN Users u ON s.user_id = u.id
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.start_time IS NOT NULL
          ORDER BY COALESCE(e.end_time, e.start_time) DESC
          LIMIT 10
        `;

        const recentActivitiesData = await DatabaseService.execute(recentActivitiesQuery);
      
      // Format dữ liệu hoạt động gần đây
  const recentActivities = recentActivitiesData.map((activity, index) => {
        const activityTime = activity.end_time || activity.start_time;
        const timeDiff = new Date() - new Date(activityTime);
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        
        let timeText = '';
        if (minutesAgo < 1) timeText = 'vừa xong';
        else if (minutesAgo < 60) timeText = `${minutesAgo} phút trước`;
        else if (minutesAgo < 1440) timeText = `${Math.floor(minutesAgo/60)} giờ trước`;
        else timeText = `${Math.floor(minutesAgo/1440)} ngày trước`;

        let action = '';
        let type = 'info';
        
        if (activity.status === 'SUBMITTED') {
          const score = activity.score !== null ? Number(activity.score) : null;
          const passScore = activity.pass_score !== null ? Number(activity.pass_score) : null;
          const validPass = passScore !== null && passScore > 0;
          const isPassed = validPass && score !== null && score > 0 && score >= passScore;
          if (isPassed) {
            action = `PASS bài thi ${activity.topic_name || 'chưa đặt tên'} (Điểm: ${score.toFixed(2)})`;
            type = 'success';
          } else if (validPass) {
            action = `NỘP bài thi ${activity.topic_name || 'chưa đặt tên'} (Không đạt - ${score !== null ? score.toFixed(2) : '0.00'}%)`;
            type = 'warning';
          } else {
            action = `NỘP bài thi ${activity.topic_name || 'chưa đặt tên'} (Thiếu ngưỡng pass - Điểm: ${score !== null ? score.toFixed(2) : 'N/A'})`;
            type = 'info';
          }
        } else if (activity.status === 'IN_PROGRESS') {
          action = `bắt đầu làm bài thi ${activity.topic_name || 'chưa đặt tên'}`;
          type = 'info';
        } else if (activity.status === 'REVIEWED') {
          action = `đã được chấm điểm bài thi ${activity.topic_name || 'chưa đặt tên'}`;
          type = 'success';
        } else {
          action = `tạo bài thi ${activity.topic_name || 'chưa đặt tên'}`;
          type = 'info';
        }

        return {
          id: index + 1,
          student: activity.student_name || 'Sinh viên',
          action: action,
          time: timeText,
          type: type
        };
      });

      // Lấy tiến độ các chủ đề từ database
      // Tiến độ chủ đề: chỉ tính hoàn thành khi sinh viên đạt điểm >= pass_score
      // participants = số sinh viên đã làm (có bất kỳ exam nào)
      // passed_students = số sinh viên có ít nhất một bài thi SUBMITTED đạt điểm qua môn
      const topicProgressQuery = `
        SELECT 
          t.id,
          t.name,
          COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN e.student_id END) as participants,
          COUNT(DISTINCT CASE 
            WHEN e.status = 'SUBMITTED' 
              AND e.score IS NOT NULL AND e.score > 0
              AND t.pass_score IS NOT NULL AND t.pass_score > 0
              AND e.score >= t.pass_score 
            THEN e.student_id END) as passed_students
        FROM Topics t
        LEFT JOIN Exams e ON t.id = e.topic_id
        GROUP BY t.id, t.name, t.pass_score
        HAVING participants > 0
        ORDER BY passed_students DESC, participants DESC
        LIMIT 10
      `;

      const topicProgressData = await DatabaseService.execute(topicProgressQuery);

      const topicProgress = topicProgressData.map(row => ({
        id: row.id,
        name: row.name || 'Chưa đặt tên',
        completed: row.participants > 0 ? Math.round((row.passed_students / row.participants) * 100) : 0,
        participants: row.participants,
        passed: row.passed_students
      }));

      // Tạo dữ liệu dashboard
      // Map lại để frontend hiện tại (DashboardPage.js) dùng được: completedStudents = số sinh viên có ÍT NHẤT một bài pass
      // inProgressStudents = số sinh viên có bài IN_PROGRESS, notStartedStudents = total - (đang làm hoặc đã pass hoặc đã fail) (ước lượng)
      const studentExamStatusQuery = `
        SELECT s.id as student_id,
          MAX(CASE WHEN e.status = 'SUBMITTED' AND e.score IS NOT NULL AND e.score > 0 AND t.pass_score IS NOT NULL AND t.pass_score > 0 AND e.score >= t.pass_score THEN 1 ELSE 0 END) as has_pass,
          MAX(CASE WHEN e.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as has_progress,
          MAX(CASE WHEN e.status = 'SUBMITTED' AND (
              (t.pass_score IS NOT NULL AND t.pass_score > 0 AND (e.score IS NULL OR e.score < t.pass_score)) OR (t.pass_score IS NULL OR t.pass_score <= 0)
            ) THEN 1 ELSE 0 END) as has_fail
        FROM Students s
        JOIN Users u ON s.user_id = u.id AND u.role = 'STUDENT'
        LEFT JOIN Exams e ON e.student_id = s.id
        LEFT JOIN Topics t ON e.topic_id = t.id
        GROUP BY s.id
      `;
      const studentExamRows = await DatabaseService.execute(studentExamStatusQuery);
      let completedStudents = 0, inProgressStudents = 0, failedStudents = 0;
      studentExamRows.forEach(r => {
        if (r.has_pass) completedStudents += 1;
        else if (r.has_progress) inProgressStudents += 1;
        else if (r.has_fail) failedStudents += 1;
      });
      const notStartedStudents = (stats.totalStudents || 0) - (completedStudents + inProgressStudents + failedStudents);

      const dashboardData = {
        stats: {
          totalStudents: stats.totalStudents || 0,
          completedStudents,
          inProgressStudents,
          notStartedStudents: notStartedStudents < 0 ? 0 : notStartedStudents
        },
        // Thêm dữ liệu mở rộng
        totalTopics: systemData.totalTopics,
        totalQuestions: systemData.totalQuestions,
        totalDepartments: systemData.totalDepartments,
        totalMajors: systemData.totalMajors,
        onlineAdmins: 1, // Có thể cập nhật sau để track thực tế
        recentActivities: recentActivities.length > 0 ? recentActivities : [
          {
            id: 1,
            student: 'Chưa có dữ liệu',
            action: 'Chưa có hoạt động nào được ghi nhận',
            time: '',
            type: 'info'
          }
        ],
        topicProgress: topicProgress.length > 0 ? topicProgress : [
          {
            id: 1,
            name: 'Chưa có chủ đề nào',
            completed: 0
          }
        ],
        departmentStats: formattedDepartmentStats.length > 0 ? formattedDepartmentStats : [
          {
            name: 'Chưa có khoa nào',
            studentCount: 0
          }
        ]
      };

      return ResponseHelper.success(res, dashboardData, 'Lấy dữ liệu dashboard thành công');
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      return ResponseHelper.error(res, 'Không thể lấy dữ liệu dashboard', 500);
    }
  }

  // Lấy thống kê chi tiết
  static async getDetailedStats(req, res) {
    try {
      const monthlyStatsQuery = `
        SELECT MONTH(created_at) month, YEAR(created_at) year, COUNT(*) count
        FROM Users
        WHERE role = 'STUDENT' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY year, month
      `;
      const monthlyStats = await DatabaseService.execute(monthlyStatsQuery);

      const overallStatsQuery = `
        SELECT 
          COUNT(*) totalUsers,
          COUNT(CASE WHEN role = 'STUDENT' THEN 1 END) totalStudents,
          COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) totalAdmins,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) newUsersThisMonth
        FROM Users
      `;
      const overallStatsRows = await DatabaseService.execute(overallStatsQuery);
      const overallStats = overallStatsRows[0] || {
        totalUsers: 0, totalStudents: 0, totalAdmins: 0, newUsersThisMonth: 0
      };

      return ResponseHelper.success(res, {
        monthly: monthlyStats,
        overall: overallStats
      }, 'Lấy thống kê chi tiết thành công');
    } catch (error) {
      console.error('Error in getDetailedStats:', error);
      return ResponseHelper.error(res, 'Không thể lấy thống kê chi tiết', 500);
    }
  }

  // Cập nhật dữ liệu realtime (mock)
  static async getRealtimeUpdates(req, res) {
    try {
      // Mô phỏng dữ liệu realtime
      const realtimeData = {
        onlineUsers: Math.floor(Math.random() * 50) + 10,
        activeExams: Math.floor(Math.random() * 20) + 5,
        completedToday: Math.floor(Math.random() * 100) + 20,
        systemStatus: 'online',
        lastUpdate: new Date().toISOString()
      };
      return ResponseHelper.success(res, realtimeData, 'Lấy dữ liệu realtime thành công');
    } catch (error) {
      console.error('Error in getRealtimeUpdates:', error);
      return ResponseHelper.error(res, 'Không thể lấy dữ liệu realtime', 500);
    }
  }
}

module.exports = DashboardController;
